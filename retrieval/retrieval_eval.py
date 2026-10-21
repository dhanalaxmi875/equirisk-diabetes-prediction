#!/usr/bin/env python3
"""
Evaluate retrieval performance on a set of test questions.
Computes hit@1, hit@4 for answerable questions and best scores for out-of-scope/unsafe.
"""

import argparse
import csv
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict
import chromadb
from sentence_transformers import SentenceTransformer
from retrieve import retrieve


def load_eval_questions(csv_path: Path) -> List[Dict[str, str]]:
    """Load evaluation questions from CSV."""
    questions = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            questions.append(row)
    return questions


def evaluate_retrieval(
    questions: List[Dict[str, str]],
    chroma_path: Path,
    k: int = 4,
    min_score: float = 0.45
) -> Dict[str, Any]:
    """
    Evaluate retrieval on a set of questions.
    
    Returns:
        Dict with evaluation metrics and detailed results
    """
    results = {
        'answerable': {
            'total': 0,
            'hit_at_1': 0,
            'hit_at_4': 0,
            'failed': []
        },
        'out_of_scope': {
            'total': 0,
            'best_scores': []
        },
        'unsafe': {
            'total': 0,
            'best_scores': []
        },
        'detailed_results': []
    }
    
    for i, question_data in enumerate(questions, 1):
        question = question_data['question']
        expected_source = question_data['expected_source_id']
        category = question_data['category']
        
        print(f"[{i}/{len(questions)}] Evaluating: {question}")
        
        # Retrieve results
        retrieved = retrieve(
            query=question,
            chroma_path=chroma_path,
            k=k,
            source_type=None,
            min_score=min_score
        )
        
        # Store detailed result
        detailed = {
            'question': question,
            'expected_source_id': expected_source,
            'category': category,
            'retrieved_count': len(retrieved),
            'retrieved_sources': [r['metadata']['source_id'] for r in retrieved],
            'best_score': retrieved[0]['score'] if retrieved else 0.0
        }
        results['detailed_results'].append(detailed)
        
        # Evaluate based on category
        if category == 'answerable':
            results['answerable']['total'] += 1
            
            # Check if expected source is in top k
            retrieved_sources = [r['metadata']['source_id'] for r in retrieved]
            
            if expected_source in retrieved_sources[:1]:
                results['answerable']['hit_at_1'] += 1
            else:
                results['answerable']['failed'].append({
                    'question': question,
                    'expected': expected_source,
                    'retrieved': retrieved_sources[:4] if retrieved_sources else []
                })
            
            if expected_source in retrieved_sources[:k]:
                results['answerable']['hit_at_4'] += 1
            
        elif category == 'out_of_scope':
            results['out_of_scope']['total'] += 1
            best_score = retrieved[0]['score'] if retrieved else 0.0
            results['out_of_scope']['best_scores'].append(best_score)
            
        elif category == 'unsafe':
            results['unsafe']['total'] += 1
            best_score = retrieved[0]['score'] if retrieved else 0.0
            results['unsafe']['best_scores'].append(best_score)
    
    return results


def print_summary(results: Dict[str, Any]):
    """Print evaluation summary."""
    print("\n" + "="*80)
    print("RETRIEVAL EVALUATION SUMMARY")
    print("="*80)
    
    # Answerable questions
    answerable = results['answerable']
    if answerable['total'] > 0:
        print(f"\nAnswerable Questions ({answerable['total']} total):")
        print(f"  Hit@1: {answerable['hit_at_1']}/{answerable['total']} ({answerable['hit_at_1']/answerable['total']*100:.1f}%)")
        print(f"  Hit@4: {answerable['hit_at_4']}/{answerable['total']} ({answerable['hit_at_4']/answerable['total']*100:.1f}%)")
        
        if answerable['failed']:
            print(f"\n  Failed Questions ({len(answerable['failed'])}):")
            for fail in answerable['failed']:
                print(f"    - Question: {fail['question']}")
                print(f"      Expected: {fail['expected']}")
                print(f"      Retrieved: {', '.join(fail['retrieved']) if fail['retrieved'] else 'None'}")
    
    # Out of scope questions
    out_of_scope = results['out_of_scope']
    if out_of_scope['total'] > 0:
        print(f"\nOut of Scope Questions ({out_of_scope['total']} total):")
        if out_of_scope['best_scores']:
            mean_score = sum(out_of_scope['best_scores']) / len(out_of_scope['best_scores'])
            print(f"  Mean best score: {mean_score:.3f}")
            print(f"  Best scores: {[f'{s:.3f}' for s in out_of_scope['best_scores']]}")
    
    # Unsafe questions
    unsafe = results['unsafe']
    if unsafe['total'] > 0:
        print(f"\nUnsafe Questions ({unsafe['total']} total):")
        if unsafe['best_scores']:
            mean_score = sum(unsafe['best_scores']) / len(unsafe['best_scores'])
            print(f"  Mean best score: {mean_score:.3f}")
            print(f"  Best scores: {[f'{s:.3f}' for s in unsafe['best_scores']]}")
    
    print("\n" + "="*80)


def save_results(results: Dict[str, Any], output_path: Path):
    """Save detailed results to CSV."""
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'question', 'expected_source_id', 'category', 'retrieved_count',
            'retrieved_sources', 'best_score'
        ])
        
        for detail in results['detailed_results']:
            writer.writerow([
                detail['question'],
                detail['expected_source_id'],
                detail['category'],
                detail['retrieved_count'],
                '; '.join(detail['retrieved_sources']),
                f"{detail['best_score']:.3f}"
            ])
    
    print(f"\nDetailed results saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate retrieval performance")
    parser.add_argument('--questions', type=Path, default=Path('eval_questions.csv'),
                        help='Path to evaluation questions CSV')
    parser.add_argument('--chroma-path', type=Path, default=Path('vector_db'),
                        help='Path to ChromaDB storage')
    parser.add_argument('--k', type=int, default=4,
                        help='Number of results to retrieve')
    parser.add_argument('--min-score', type=float, default=0.45,
                        help='Minimum similarity score threshold')
    parser.add_argument('--output', type=Path, default=Path('retrieval_eval_results.csv'),
                        help='Path to save results CSV')
    
    args = parser.parse_args()
    
    # Load questions
    print(f"Loading evaluation questions from {args.questions}...")
    questions = load_eval_questions(args.questions)
    print(f"Loaded {len(questions)} questions.")
    
    # Evaluate
    print("\nEvaluating retrieval...")
    results = evaluate_retrieval(
        questions=questions,
        chroma_path=args.chroma_path,
        k=args.k,
        min_score=args.min_score
    )
    
    # Print summary
    print_summary(results)
    
    # Save results
    save_results(results, args.output)
    
    # Chunk size recommendation
    print("\n" + "="*80)
    print("CHUNK SIZE RECOMMENDATION")
    print("="*80)
    print("Based on the evaluation results:")
    print("- If hit@1 is below 70%, consider reducing chunk size to 300-350 tokens")
    print("- If hit@1 is above 85%, consider increasing chunk size to 450-500 tokens")
    print("- If out-of-scope questions score above 0.3, consider reducing chunk size")
    print("  to improve specificity")
    print("- Current chunk size: 400 tokens (adjust with --chunk-size in ingest.py)")
    print("="*80)


if __name__ == '__main__':
    main()
