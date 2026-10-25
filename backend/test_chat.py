#!/usr/bin/env python3
"""
Test script for the RAG chatbot endpoint.
"""

import requests
import json
import os

# API endpoint
API_URL = "http://localhost:8000/chat"

# Test queries
test_queries = [
    "what is prediabetes",
    "can prediabetes be reversed",
    "what is HbA1c",
    "what does a high risk result in EquiRisk mean",
    "what is SHAP"
]

print(f"Testing chat endpoint at {API_URL}")
print(f"LLM Provider: {os.getenv('LLM_PROVIDER', 'gemini')}")
print()

for query in test_queries:
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print('='*60)
    
    payload = {
        "query": query,
        "k": 4,
        "min_score": 0.45
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nAnswer:\n{result['answer']}")
            print(f"\nSources ({len(result['sources'])}):")
            for i, source in enumerate(result['sources'], 1):
                print(f"  {i}. {source['title']} ({source['organisation']}) - Score: {source['score']:.3f}")
            print(f"\nSafe: {result['safe']}, Category: {result['category']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Request failed: {e}")
