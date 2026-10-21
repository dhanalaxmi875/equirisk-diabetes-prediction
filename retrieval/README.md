# EquiRisk RAG Retrieval Layer

This directory contains the retrieval layer for the EquiRisk RAG chatbot. It handles ingesting markdown knowledge base files into a vector database and retrieving relevant chunks for queries.

## Files

- `ingest.py` - Ingest markdown files into ChromaDB with embeddings
- `retrieve.py` - Retrieve relevant chunks for a query
- `retrieval_eval.py` - Evaluate retrieval performance on test questions
- `eval_questions.csv` - Test questions for evaluation (30 questions)
- `requirements.txt` - Python dependencies

## Installation

```bash
cd retrieval
pip install -r requirements.txt
```

## Usage

### 1. Ingest Knowledge Base

First, ingest the markdown files into ChromaDB:

```bash
python ingest.py
```

Optional arguments:
- `--input-dir`: Directory containing markdown files (default: `knowledge_base/clean`)
- `--chroma-path`: Path to ChromaDB storage (default: `vector_db`)
- `--chunk-size`: Target chunk size in tokens (default: 400)
- `--overlap`: Overlap between chunks in tokens (default: 60)
- `--min-chunk-length`: Minimum chunk length in characters (default: 200)

Example with custom chunk size:
```bash
python ingest.py --chunk-size 350 --overlap 50
```

### 2. Retrieve Chunks

Test retrieval with a query:

```bash
python retrieve.py --query "what is prediabetes"
```

Optional arguments:
- `--query`: Search query (required)
- `--chroma-path`: Path to ChromaDB storage (default: `vector_db`)
- `--k`: Number of results to return (default: 4)
- `--source-type`: Filter by source type (`external` or `equirisk`, default: all)
- `--min-score`: Minimum similarity score threshold (default: 0.45)
- `--no-query-prefix`: Disable BGE query prefix

Example:
```bash
python retrieve.py --query "what is SHAP" --source-type equirisk --k 3
```

### 3. Evaluate Retrieval

Run evaluation on test questions:

```bash
python retrieval_eval.py
```

Optional arguments:
- `--questions`: Path to evaluation questions CSV (default: `eval_questions.csv`)
- `--chroma-path`: Path to ChromaDB storage (default: `vector_db`)
- `--k`: Number of results to retrieve (default: 4)
- `--min-score`: Minimum similarity score threshold (default: 0.45)
- `--output`: Path to save results CSV (default: `retrieval_eval_results.csv`)

## Run Order

1. `ingest.py` - First run to build the vector database
2. `retrieval_eval.py` - After ingestion to evaluate performance

## Knowledge Base

The knowledge base contains 14 sources (~116k characters):
- 5 EquiRisk sources (system documentation, FAQ, glossary, limitations)
- 9 external sources (CDC, NIDDK, WHO)

Each markdown file has YAML front matter with:
- `title`
- `organisation`
- `url`
- `topic`
- `date_accessed`

## Chunking Strategy

- Split by Markdown headings first
- Then split by size (~400 tokens per chunk)
- ~60 tokens overlap between chunks
- Never split mid-sentence
- Section heading is prepended to each chunk
- Chunks under 200 characters are dropped
- Exact and near-duplicate chunks are removed

## Embeddings

- Model: `sentence-transformers BAAI/bge-small-en-v1.5`
- Normalized embeddings
- BGE query prefix used for queries only (not documents)
- Cosine similarity in ChromaDB

## Metadata

Each chunk includes:
- `source_id`: File identifier
- `title`: Document title
- `organisation`: Source organization
- `url`: Source URL
- `topic`: Document topic
- `section_heading`: Markdown section heading
- `chunk_index`: Chunk index within source
- `date_accessed`: When source was accessed
- `source_type`: "equirisk" or "external"

## Evaluation

The evaluation set contains 30 questions:
- 20 answerable questions (diabetes-related)
- 5 out-of-scope questions (unrelated topics)
- 5 unsafe questions (medical advice requests)

Metrics:
- Hit@1 and Hit@4 for answerable questions
- Mean best score for out-of-scope and unsafe questions
- Detailed failure analysis

Results saved to `retrieval_eval_results.csv`.
