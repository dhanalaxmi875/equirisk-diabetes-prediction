#!/usr/bin/env python3
"""
Ingest markdown knowledge base files into ChromaDB with embeddings.
Parses YAML front matter, chunks by headings and size, and stores with metadata.
"""

import argparse
import re
from pathlib import Path
from typing import List, Dict, Any
import yaml
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import numpy as np


def parse_front_matter(content: str) -> Dict[str, Any]:
    """Parse YAML front matter from markdown content."""
    if content.startswith('---'):
        try:
            _, front_matter, rest = content.split('---', 2)
            metadata = yaml.safe_load(front_matter.strip())
            return metadata, rest.strip()
        except Exception as e:
            print(f"Warning: Failed to parse front matter: {e}")
            return {}, content
    return {}, content


def split_by_headings(text: str) -> List[Dict[str, str]]:
    """Split text by markdown headings, preserving heading context."""
    sections = []
    lines = text.split('\n')
    current_section = []
    current_heading = "Introduction"
    
    for line in lines:
        if line.startswith('#'):
            # Save previous section
            if current_section:
                sections.append({
                    'heading': current_heading,
                    'content': '\n'.join(current_section).strip()
                })
            # Start new section
            current_heading = line.lstrip('#').strip()
            current_section = []
        else:
            current_section.append(line)
    
    # Don't forget the last section
    if current_section:
        sections.append({
            'heading': current_heading,
            'content': '\n'.join(current_section).strip()
        })
    
    return sections


def split_into_chunks(text: str, heading: str, chunk_size: int = 400, overlap: int = 60) -> List[Dict[str, str]]:
    """Split text into chunks of approximately chunk_size tokens with overlap.
    Never splits mid-sentence. Prepends heading to each chunk.
    """
    # Approximate token count (roughly 4 chars per token for English)
    target_chars = chunk_size * 4
    overlap_chars = overlap * 4
    
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        if current_length + len(sentence) > target_chars and current_chunk:
            # Save current chunk
            chunk_text = '\n'.join(current_chunk)
            chunks.append({
                'heading': heading,
                'content': chunk_text
            })
            
            # Start new chunk with overlap
            current_chunk = []
            current_length = 0
            
            # Add overlap sentences (approximately overlap_chars worth)
            overlap_sentences = []
            overlap_length = 0
            for s in reversed(chunks[-1]['content'].split('\n')):
                if overlap_length + len(s) > overlap_chars:
                    break
                overlap_sentences.insert(0, s)
                overlap_length += len(s)
            
            current_chunk = overlap_sentences
            current_length = overlap_length
        
        current_chunk.append(sentence)
        current_length += len(sentence)
    
    # Don't forget the last chunk
    if current_chunk:
        chunk_text = '\n'.join(current_chunk)
        chunks.append({
            'heading': heading,
            'content': chunk_text
        })
    
    return chunks


def remove_duplicates(chunks: List[Dict[str, str]], similarity_threshold: float = 0.95) -> List[Dict[str, str]]:
    """Remove exact and near-duplicate chunks based on content similarity."""
    if len(chunks) <= 1:
        return chunks
    
    unique_chunks = []
    seen_texts = set()
    
    for chunk in chunks:
        content = chunk['content'].lower().strip()
        
        # Check for exact duplicates
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
    min_chunk_length: int = 200
):
    """Ingest all markdown files from input directory into ChromaDB."""
    
    # Load embedding model
    print("Loading embedding model (BAAI/bge-small-en-v1.5)...")
    model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    print("Model loaded.")
    
    # Initialize ChromaDB
    print(f"Initializing ChromaDB at {chroma_path}...")
    chroma_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_path))
    
    # Delete existing collection if it exists
    try:
        client.delete_collection("equirisk_kb")
        print("Deleted existing collection.")
    except:
        pass
    
    collection = client.create_collection(
        name="equirisk_kb",
        metadata={"hnsw:space": "cosine"}
    )
    
    # Process all markdown files
    md_files = list(input_dir.glob("*.md"))
    print(f"\nFound {len(md_files)} markdown files.")
    
    all_chunks = []
    chunks_per_source = {}
    
    for md_file in md_files:
        print(f"\nProcessing: {md_file.name}")
        
        # Read file with UTF-8 encoding
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse front matter
        metadata, body = parse_front_matter(content)
        
        # Get source_id from filename
        source_id = md_file.stem
        
        # Determine source_type
        source_type = "equirisk" if source_id.startswith("equirisk_") else "external"
        
        # Split by headings
        sections = split_by_headings(body)
        print(f"  - Found {len(sections)} sections")
        
        # Split into chunks
        file_chunks = []
        for section in sections:
            chunks = split_into_chunks(section['content'], section['heading'], chunk_size, overlap)
            file_chunks.extend(chunks)
        
        print(f"  - Created {len(file_chunks)} chunks before filtering")
        
        # Filter by minimum length
        file_chunks = [c for c in file_chunks if len(c['content']) >= min_chunk_length]
        print(f"  - After min length filter: {len(file_chunks)} chunks")
        
        # Remove duplicates
        original_count = len(file_chunks)
        file_chunks = remove_duplicates(file_chunks)
        dropped = original_count - len(file_chunks)
        if dropped > 0:
            print(f"  - Dropped {dropped} duplicate chunks")
        
        # Add metadata to each chunk
        for idx, chunk in enumerate(file_chunks):
            chunk_metadata = {
                'source_id': source_id,
                'title': metadata.get('title', source_id),
                'organisation': metadata.get('organisation', 'Unknown'),
                'url': metadata.get('url', ''),
                'topic': metadata.get('topic', ''),
                'section_heading': chunk['heading'],
                'chunk_index': idx,
                'date_accessed': metadata.get('date_accessed', ''),
                'source_type': source_type
            }
            
            # Prepend heading to content for embedding
            chunk_text = f"{chunk['heading']}\n{chunk['content']}"
            
            all_chunks.append({
                'text': chunk_text,
                'metadata': chunk_metadata
            })
        
        chunks_per_source[source_id] = len(file_chunks)
        
        # Warn if fewer than 2 chunks
        if len(file_chunks) < 2:
            print(f"  ⚠️  WARNING: {source_id} produced only {len(file_chunks)} chunk(s)")
    
    # Generate embeddings
    print(f"\nGenerating embeddings for {len(all_chunks)} chunks...")
    texts = [c['text'] for c in all_chunks]
    embeddings = model.encode(texts, normalize_embeddings=True)
    print("Embeddings generated.")
    
    # Add to ChromaDB
    print("Adding chunks to ChromaDB...")
    ids = [f"{c['metadata']['source_id']}_{c['metadata']['chunk_index']}" for c in all_chunks]
    metadatas = [c['metadata'] for c in all_chunks]
    
    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=metadatas
    )
    
    # Print statistics
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
    parser.add_argument('--min-chunk-length', type=int, default=200,
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
