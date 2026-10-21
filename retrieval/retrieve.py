#!/usr/bin/env python3
"""
Retrieve relevant chunks from ChromaDB for a given query.
Supports filtering by source_type and minimum score threshold.
"""

import argparse
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from sentence_transformers import SentenceTransformer


def retrieve(
    query: str,
    chroma_path: Path = Path('vector_db'),
    k: int = 4,
    source_type: str = None,
    min_score: float = 0.45,
    use_query_prefix: bool = True
) -> List[Dict[str, Any]]:
    """
    Retrieve relevant chunks for a query.
    
    Args:
        query: The search query
        chroma_path: Path to ChromaDB storage
        k: Number of results to return
        source_type: Filter by source_type ("external" or "equirisk"), None for all
        min_score: Minimum cosine similarity score threshold
        use_query_prefix: Whether to use BGE query prefix
    
    Returns:
        List of dicts with keys: score, text, metadata
    """
    # Load embedding model
    model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    
    # Add BGE query prefix if requested
    if use_query_prefix:
        query = f"Represent this sentence for searching relevant passages: {query}"
    
    # Generate query embedding
    query_embedding = model.encode(query, normalize_embeddings=True)
    
    # Connect to ChromaDB
    client = chromadb.PersistentClient(path=str(chroma_path))
    collection = client.get_collection("equirisk_kb")
    
    # Build where filter for source_type
    where_filter = None
    if source_type is not None:
        where_filter = {"source_type": source_type}
    
    # Query
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=k,
        where=where_filter
    )
    
    # Format results
    formatted_results = []
    for i in range(len(results['ids'][0])):
        score = results['distances'][0][i]  # Cosine distance (lower is better)
        # Convert to similarity score (higher is better)
        similarity_score = 1 - score
        
        if similarity_score < min_score:
            continue
        
        formatted_results.append({
            'score': similarity_score,
            'text': results['documents'][0][i],
            'metadata': results['metadatas'][0][i]
        })
    
    return formatted_results


def print_results(results: List[Dict[str, Any]], preview_length: int = 200):
    """Print retrieval results in a formatted way."""
    if not results:
        print("No results found.")
        return
    
    print(f"\n{'='*80}")
    print(f"Found {len(results)} result(s)")
    print(f"{'='*80}\n")
    
    for i, result in enumerate(results, 1):
        metadata = result['metadata']
        score = result['score']
        text = result['text']
        
        print(f"Result {i} (Score: {score:.3f})")
        print(f"  Source: {metadata['title']}")
        print(f"  Organisation: {metadata['organisation']}")
        print(f"  Section: {metadata['section_heading']}")
        print(f"  URL: {metadata['url']}")
        print(f"  Preview: {text[:preview_length]}...")
        print()


def main():
    parser = argparse.ArgumentParser(description="Retrieve chunks from ChromaDB")
    parser.add_argument('--query', type=str, required=True,
                        help='Search query')
    parser.add_argument('--chroma-path', type=Path, default=Path('vector_db'),
                        help='Path to ChromaDB storage')
    parser.add_argument('--k', type=int, default=4,
                        help='Number of results to return')
    parser.add_argument('--source-type', type=str, choices=['external', 'equirisk'], default=None,
                        help='Filter by source type')
    parser.add_argument('--min-score', type=float, default=0.45,
                        help='Minimum similarity score threshold')
    parser.add_argument('--no-query-prefix', action='store_true',
                        help='Disable BGE query prefix')
    
    args = parser.parse_args()
    
    results = retrieve(
        query=args.query,
        chroma_path=args.chroma_path,
        k=args.k,
        source_type=args.source_type,
        min_score=args.min_score,
        use_query_prefix=not args.no_query_prefix
    )
    
    print_results(results)


if __name__ == '__main__':
    main()
