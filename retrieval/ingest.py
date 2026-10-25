#!/usr/bin/env python3
"""
Ingest markdown knowledge base files into ChromaDB with embeddings.
Parses YAML front matter, cleans markdown links and navigation noise,
chunks by headings and size, and stores with metadata (including source_url).
"""

import argparse
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
import yaml
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np


def clean_markdown_links_and_markers(text: str) -> str:
    """
    Convert [text](url) to just text, remove ** and other markdown markers,
    drop leftover navigation fragments, and clean up formatting.
    """
    if not text:
        return ""

    # Replace non-breaking spaces and zero-width characters
    cleaned = text.replace('\xa0', ' ').replace('\u200b', '')

    # Convert markdown links [text](url) -> text
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)

    # Remove bold, italics, code markers
    cleaned = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', cleaned)
    cleaned = re.sub(r'_{1,3}([^_]+)_{1,3}', r'\1', cleaned)
    cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)
    cleaned = cleaned.replace('**', '').replace('__', '')

    # Drop leftover navigation fragments and link-only lines
    nav_patterns = [
        r'^\s*View or Print All Sections.*$',
        r'^\s*Keep Reading.*$',
        r'^\s*The Surprising Truth About Prediabetes.*$',
        r'^\s*Ready to get started\??.*$',
        r'^\s*Find a lifestyle change program.*$',
        r'^\s*Find out if you have a high risk.*taking the 1-minute.*$',
        r'^\s*Take the 1-minute prediabetes risk test.*$',
        r'^\s*Click here to learn more.*$',
        r'^\s*Related Topics.*$',
        r'^\s*More information.*$',
    ]
    for pattern in nav_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.MULTILINE | re.IGNORECASE)

    # Normalize multiple newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
    return cleaned


def parse_front_matter(content: str) -> Tuple[Dict[str, Any], str]:
    """Parse YAML front matter from markdown content."""
    if content.startswith('---'):
        try:
            _, front_matter, rest = content.split('---', 2)
            metadata = yaml.safe_load(front_matter.strip())
            return metadata or {}, rest.strip()
        except Exception as e:
            print(f"Warning: Failed to parse front matter: {e}")
            return {}, content
    return {}, content


def split_by_headings(text: str) -> List[Dict[str, str]]:
    """Split text by markdown headings, preserving heading context and cleaning headings."""
    sections = []
    lines = text.split('\n')
    current_section = []
    current_heading = "Introduction"
    
    for line in lines:
        if line.startswith('#'):
            # Save previous section
            if current_section:
                content_str = '\n'.join(current_section).strip()
                if content_str:
                    sections.append({
                        'heading': current_heading,
                        'content': content_str
                    })
            # Start new section
            raw_heading = line.lstrip('#').strip()
            # Clean heading from markdown links and bold markers
            clean_heading = clean_markdown_links_and_markers(raw_heading)
            current_heading = clean_heading if clean_heading else "Section"
            current_section = []
        else:
            current_section.append(line)
    
    # Last section
    if current_section:
        content_str = '\n'.join(current_section).strip()
        if content_str:
            sections.append({
                'heading': current_heading,
                'content': content_str
            })
    
    return sections


def split_into_chunks(text: str, heading: str, chunk_size: int = 400, overlap: int = 60) -> List[Dict[str, str]]:
    """
    Split text into chunks of approximately chunk_size tokens with overlap.
    Never splits mid-sentence. Collapses repeated headings.
    """
    target_chars = chunk_size * 4
    overlap_chars = overlap * 4
    
    # Clean text before chunking
    cleaned_text = clean_markdown_links_and_markers(text)
    
    # Collapse repeated heading if content begins with the heading
    heading_lower = heading.lower().strip()
    lines = cleaned_text.split('\n')
    while lines and lines[0].lower().strip() == heading_lower:
        lines.pop(0)
    cleaned_text = '\n'.join(lines).strip()

    sentences = re.split(r'(?<=[.!?])\s+', cleaned_text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        if current_length + len(sentence) > target_chars and current_chunk:
            chunk_text = ' '.join(current_chunk).strip()
            if chunk_text:
                chunks.append({
                    'heading': heading,
                    'content': chunk_text
                })
            
            current_chunk = []
            current_length = 0
            
            # Add overlap
            overlap_sentences = []
            overlap_length = 0
            if chunks:
                prev_sentences = re.split(r'(?<=[.!?])\s+', chunks[-1]['content'])
                for s in reversed(prev_sentences):
                    if overlap_length + len(s) > overlap_chars:
                        break
                    overlap_sentences.insert(0, s)
                    overlap_length += len(s)
            
            current_chunk = overlap_sentences
            current_length = overlap_length
        
        current_chunk.append(sentence)
        current_length += len(sentence)
    
    if current_chunk:
        chunk_text = ' '.join(current_chunk).strip()
        if chunk_text:
            chunks.append({
                'heading': heading,
                'content': chunk_text
            })
    
    return chunks


def remove_duplicates(chunks: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Remove exact and near-duplicate chunks based on content similarity."""
    if len(chunks) <= 1:
        return chunks
    
    unique_chunks = []
    seen_texts = set()
    
    for chunk in chunks:
        content = chunk['content'].lower().strip()
        if content in seen_texts:
            continue
        seen_texts.add(content)
        unique_chunks.append(chunk)
    
    return unique_chunks


def ingest_directory(
    input_dir: Path,
    chroma_path: Path,
    chunk_size: int = 400,
    overlap: int = 60,
    min_chunk_length: int = 150
):
    """Ingest all markdown files from input directory into ChromaDB with clean metadata."""
    
    print("Loading embedding model (BAAI/bge-small-en-v1.5)...")
    model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    print("Model loaded.")
    
    print(f"Initializing ChromaDB at {chroma_path}...")
    chroma_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_path))
    
    try:
        client.delete_collection("equirisk_kb")
        print("Deleted existing collection.")
    except Exception:
        pass
    
    collection = client.create_collection(
        name="equirisk_kb",
        metadata={"hnsw:space": "cosine"}
    )
    
    md_files = sorted(list(input_dir.glob("*.md")))
    print(f"\nFound {len(md_files)} markdown files.")
    
    all_chunks = []
    chunks_per_source = {}
    
    for md_file in md_files:
        print(f"\nProcessing: {md_file.name}")
        
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        metadata, body = parse_front_matter(content)
        source_id = md_file.stem
        source_type = "equirisk" if source_id.startswith("equirisk_") else "external"
        source_url = metadata.get('url', '')
        
        sections = split_by_headings(body)
        print(f"  - Found {len(sections)} sections")
        
        file_chunks = []
        for section in sections:
            chunks = split_into_chunks(section['content'], section['heading'], chunk_size, overlap)
            file_chunks.extend(chunks)
        
        print(f"  - Created {len(file_chunks)} chunks before filtering")
        file_chunks = [c for c in file_chunks if len(c['content']) >= min_chunk_length]
        print(f"  - After min length filter: {len(file_chunks)} chunks")
        
        original_count = len(file_chunks)
        file_chunks = remove_duplicates(file_chunks)
        dropped = original_count - len(file_chunks)
        if dropped > 0:
            print(f"  - Dropped {dropped} duplicate chunks")
        
        for idx, chunk in enumerate(file_chunks):
            # Clean heading and content
            clean_heading = chunk['heading'].strip()
            clean_content = chunk['content'].strip()
            
            # Avoid repeating the heading twice if content already begins with it
            if clean_content.lower().startswith(clean_heading.lower()):
                chunk_text = clean_content
            else:
                chunk_text = f"{clean_heading}\n{clean_content}"
            
            chunk_metadata = {
                'source_id': source_id,
                'title': metadata.get('title', source_id),
                'organisation': metadata.get('organisation', 'Unknown'),
                'url': source_url,           # Real full URL from front matter
                'source_url': source_url,    # Explicit source_url
                'topic': metadata.get('topic', ''),
                'section_heading': clean_heading,
                'chunk_index': idx,
                'date_accessed': str(metadata.get('date_accessed', '')),
                'source_type': source_type
            }
            
            all_chunks.append({
                'text': chunk_text,
                'metadata': chunk_metadata
            })
        
        chunks_per_source[source_id] = len(file_chunks)
        if len(file_chunks) < 2:
            print(f"  WARNING: {source_id} produced only {len(file_chunks)} chunk(s)")
    
    print(f"\nGenerating embeddings for {len(all_chunks)} chunks...")
    texts = [c['text'] for c in all_chunks]
    embeddings = model.encode(texts, normalize_embeddings=True)
    print("Embeddings generated.")
    
    print("Adding chunks to ChromaDB...")
    ids = [f"{c['metadata']['source_id']}_{c['metadata']['chunk_index']}" for c in all_chunks]
    metadatas = [c['metadata'] for c in all_chunks]
    
    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=metadatas
    )
    
    print("\n" + "="*60)
    print("INGESTION COMPLETE")
    print("="*60)
    print(f"Files processed: {len(md_files)}")
    print(f"Total chunks: {len(all_chunks)}")
    
    chunk_lengths = [len(c['text']) for c in all_chunks]
    print(f"Average chunk length: {np.mean(chunk_lengths):.0f} characters")
    print(f"Min chunk length: {np.min(chunk_lengths)} characters")
    print(f"Max chunk length: {np.max(chunk_lengths)} characters")
    
    print("\nChunks per source:")
    for source_id, count in sorted(chunks_per_source.items()):
        print(f"  {source_id}: {count}")
    
    print(f"\nChromaDB collection saved to: {chroma_path}")
    return len(all_chunks)


def main():
    parser = argparse.ArgumentParser(description="Ingest markdown knowledge base into ChromaDB")
    parser.add_argument('--input-dir', type=Path, default=Path('knowledge_base/clean'),
                        help='Directory containing markdown files')
    parser.add_argument('--chroma-path', type=Path, default=Path('vector_db'),
                        help='Path to ChromaDB storage')
    parser.add_argument('--chunk-size', type=int, default=400,
                        help='Target chunk size in tokens')
    parser.add_argument('--overlap', type=int, default=60,
                        help='Overlap between chunks in tokens')
    parser.add_argument('--min-chunk-length', type=int, default=150,
                        help='Minimum chunk length in characters')
    
    args = parser.parse_args()
    
    ingest_directory(
        input_dir=args.input_dir,
        chroma_path=args.chroma_path,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
        min_chunk_length=args.min_chunk_length
    )


if __name__ == '__main__':
    main()
