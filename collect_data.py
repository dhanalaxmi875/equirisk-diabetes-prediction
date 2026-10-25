#!/usr/bin/env python3
"""
collect_data.py - Knowledge Base Data Collector for EquiRisk RAG Chatbot

Downloads and extracts clinical guidelines, prevention resources, and health articles
from web pages and PDFs specified in a sources CSV.
Stores raw content and cleaned Markdown with structured YAML front matter.
"""

from __future__ import annotations

import argparse
import csv
import datetime
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

try:
    import trafilatura
except ImportError:
    trafilatura = None

try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None

try:
    import yaml
except ImportError:
    yaml = None


DEFAULT_USER_AGENT = (
    "EquiRisk-RAG-Bot/1.0 (+https://github.com/dhanalaxmi875/equirisk-diabetes-prediction; "
    "contact: research@equirisk.local) Mozilla/5.0"
)

# Common boilerplate / noise patterns to strip out of extracted text
BOILERPLATE_PATTERNS = [
    re.compile(r"^\s*(skip to (main )?content|jump to content)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(cookie policy|cookie settings|cookie preferences|accept (all )?cookies)\s*$", re.IGNORECASE),
    re.compile(r"^\s*we use cookies to (ensure|give|provide|improve).{0,150}$", re.IGNORECASE),
    re.compile(r"^\s*(share on (facebook|twitter|x|linkedin)|share this (page|article))\s*$", re.IGNORECASE),
    re.compile(r"^\s*(all rights reserved|copyright ©? \d{4}).{0,80}$", re.IGNORECASE),
    re.compile(r"^\s*(terms of (use|service)|privacy policy|legal disclaimer)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(back to top|return to top|page top)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(sign up for newsletter|subscribe to newsletter|follow us)\s*$", re.IGNORECASE),
]


class RobotsCache:
    """Caches and queries robots.txt policies per domain."""

    def __init__(self, user_agent: str, session: requests.Session):
        self.user_agent = user_agent
        self.session = session
        self._cache: Dict[str, RobotFileParser] = {}

    def is_allowed(self, target_url: str) -> bool:
        parsed = urlparse(target_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in self._cache:
            parser = RobotFileParser()
            robots_url = f"{origin}/robots.txt"
            try:
                resp = self.session.get(robots_url, timeout=10)
                if resp.status_code == 200:
                    parser.parse(resp.text.splitlines())
                else:
                    # If robots.txt returns 404 or cannot be fetched, standard practice allows crawling
                    parser.allow_all = True
            except Exception as exc:
                print(f"  [robots.txt] Note: Could not fetch robots.txt for {origin} ({exc}). Permitting access.")
                parser.allow_all = True
            self._cache[origin] = parser

        parser = self._cache[origin]
        if getattr(parser, "allow_all", False):
            return True
        return parser.can_fetch(self.user_agent, target_url)


def parse_keep_pages(keep_pages_str: Optional[str], total_pages: int) -> List[int]:
    """
    Parses human page ranges like '1-5, 8, 12-14' into 0-indexed page indices.
    If string is empty or None, returns all pages [0, 1, ..., total_pages - 1].
    """
    if not keep_pages_str or not str(keep_pages_str).strip():
        return list(range(total_pages))

    indices: List[int] = []
    clean_str = str(keep_pages_str).strip().replace(";", ",")
    parts = clean_str.split(",")

    for part in parts:
        item = part.strip()
        if not item:
            continue
        if "-" in item:
            start_s, end_s = item.split("-", 1)
            try:
                start = int(start_s.strip())
                end = int(end_s.strip())
                # Human 1-based to 0-based inclusive
                for p in range(start, end + 1):
                    if 1 <= p <= total_pages:
                        idx = p - 1
                        if idx not in indices:
                            indices.append(idx)
            except ValueError:
                print(f"  [PDF Warning] Could not parse range token '{item}'. Skipping.")
        else:
            try:
                p = int(item)
                if 1 <= p <= total_pages:
                    idx = p - 1
                    if idx not in indices:
                        indices.append(idx)
            except ValueError:
                print(f"  [PDF Warning] Could not parse page token '{item}'. Skipping.")

    if not indices:
        print("  [PDF Warning] No valid page numbers found in keep_pages; defaulting to all pages.")
        return list(range(total_pages))

    return sorted(indices)


def clean_markdown_text(text: str) -> str:
    """
    Cleans raw markdown text:
    - Removes common navigation phrases, cookie disclaimers, and footers.
    - Eliminates duplicate repeated lines (e.g. repeated site navigation).
    - Collapses excessive empty lines while preserving paragraph and heading structure.
    """
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines: List[str] = []
    last_line = None

    for raw_line in lines:
        line = raw_line.strip()

        # Remove repeated consecutive lines
        if line and line == last_line:
            continue

        # Check against boilerplate navigation/cookie regexes
        is_boilerplate = False
        for pattern in BOILERPLATE_PATTERNS:
            if pattern.search(line):
                is_boilerplate = True
                break

        if is_boilerplate:
            continue

        cleaned_lines.append(raw_line)
        if line:
            last_line = line

    # Join and normalize multiple blank lines to at most two newlines
    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def extract_pdf_to_markdown(pdf_bytes: bytes, keep_pages_str: Optional[str]) -> str:
    """
    Extracts text from PDF bytes using PyMuPDF (fitz) for specified keep_pages.
    Preserves headings using relative font size analysis and formats cleanly as Markdown.
    """
    if pymupdf is None:
        raise RuntimeError("PyMuPDF is not installed. Please run: pip install pymupdf")

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    total_pages = doc.page_count
    target_pages = parse_keep_pages(keep_pages_str, total_pages)

    # First pass: collect span font sizes to establish dominant body font size
    font_sizes: List[float] = []
    for pno in target_pages:
        page = doc.load_page(pno)
        page_dict = page.get_text("dict")
        for block in page_dict.get("blocks", []):
            if block.get("type") == 0:  # text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        txt = span.get("text", "").strip()
                        if len(txt) > 3:
                            font_sizes.append(round(span.get("size", 10.0), 1))

    if font_sizes:
        # Calculate median font size as baseline body text size
        sorted_sizes = sorted(font_sizes)
        body_size = sorted_sizes[len(sorted_sizes) // 2]
    else:
        body_size = 11.0

    md_output: List[str] = []

    for pno in target_pages:
        page = doc.load_page(pno)
        page_h = page.rect.height
        page_dict = page.get_text("dict")

        page_lines: List[str] = []

        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue

            b_rect = block.get("bbox", (0, 0, 0, 0))
            # Filter out running header and footer zones (top 5% or bottom 5% of page)
            if b_rect[3] < 35 or b_rect[1] > (page_h - 40):
                continue

            for line in block.get("lines", []):
                line_spans = line.get("spans", [])
                if not line_spans:
                    continue

                line_text = "".join(span.get("text", "") for span in line_spans).strip()
                if not line_text:
                    continue

                # Heading detection based on font size and flags (bold)
                max_span_size = max(span.get("size", 10.0) for span in line_spans)
                is_bold = any(
                    (span.get("flags", 0) & 2 != 0) or ("bold" in span.get("font", "").lower())
                    for span in line_spans
                )

                # Format as heading if text is concise (< 140 chars) and significantly larger or bold
                if len(line_text) < 140:
                    if max_span_size >= body_size * 1.4:
                        page_lines.append(f"\n## {line_text}\n")
                        continue
                    elif max_span_size >= body_size * 1.2:
                        page_lines.append(f"\n### {line_text}\n")
                        continue
                    elif is_bold and max_span_size >= body_size * 1.05:
                        page_lines.append(f"\n#### {line_text}\n")
                        continue

                page_lines.append(line_text)

        if page_lines:
            page_text = "\n".join(page_lines)
            md_output.append(f"<!-- Page {pno + 1} -->\n{page_text}")

    full_md = "\n\n".join(md_output)
    return clean_markdown_text(full_md)


def extract_web_to_markdown(html_text: str) -> str:
    """
    Extracts main article text and headings from HTML using trafilatura,
    converting to clean Markdown.
    """
    if trafilatura is None:
        raise RuntimeError("trafilatura is not installed. Please run: pip install trafilatura")

    extracted = trafilatura.extract(
        html_text,
        output_format="markdown",
        include_formatting=True,
        include_links=True,
        include_tables=True,
        favor_recall=True,
        no_fallback=False,
    )

    if not extracted or not extracted.strip():
        # Fallback to trafilatura baseline if standard extraction misses minimal content
        extracted = trafilatura.baseline(html_text) or ""

    return clean_markdown_text(extracted)


def make_yaml_front_matter(meta: Dict[str, Any]) -> str:
    """
    Generates structured YAML front matter for Markdown documents.
    """
    fields = [
        ("title", meta.get("title", "")),
        ("organisation", meta.get("organisation", "")),
        ("url", meta.get("url", "")),
        ("topic", meta.get("topic", "")),
        ("date_accessed", meta.get("date_accessed", "")),
    ]

    lines = ["---"]
    for key, val in fields:
        # Clean and quote strings cleanly
        escaped = str(val).replace('"', '\\"').replace("\n", " ")
        lines.append(f'{key}: "{escaped}"')
    lines.append("---\n")
    return "\n".join(lines)


def process_sources(
    sources_path: str,
    output_dir: str,
    dry_run: bool = False,
    delay: float = 2.0,
    user_agent: str = DEFAULT_USER_AGENT,
    respect_robots: bool = True,
) -> None:
    """
    Reads sources_list.csv, downloads and extracts content, writes clean Markdown,
    and updates knowledge_base/sources.csv.
    """
    if not os.path.exists(sources_path):
        print(f"[Error] Sources file '{sources_path}' not found.")
        sys.exit(1)

    raw_dir = os.path.join(output_dir, "raw")
    clean_dir = os.path.join(output_dir, "clean")

    if not dry_run:
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(clean_dir, exist_ok=True)

    sources_to_process: List[Dict[str, str]] = []
    with open(sources_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sources_to_process.append({k.strip(): (v.strip() if v else "") for k, v in row.items()})

    print(f"\n{'='*70}")
    print(f"EquiRisk Knowledge Base Collector | Found {len(sources_to_process)} sources")
    print(f"Config: Dry-Run={dry_run} | Delay={delay}s | Output='{output_dir}'")
    print(f"{'='*70}\n")

    if dry_run:
        print("[DRY-RUN MODE] The following sources would be processed:\n")
        for i, src in enumerate(sources_to_process, 1):
            src_type = src.get("type", "web").lower()
            kp = src.get("keep_pages") or "(all pages / not set)"
            print(f"[{i:02d}] ID: {src.get('id')}")
            print(f"     Title: {src.get('title')}")
            print(f"     Type:  {src_type} | Topic: {src.get('topic')}")
            print(f"     URL:   {src.get('url')}")
            if src_type == "pdf":
                print(f"     Pages: {kp}")
            print()
        print("Dry run completed. No files downloaded or written.")
        return

    session = requests.Session()
    # Configure resilient retry strategy for transient connection failures and 429/5xx status codes
    retries = Retry(
        total=3,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })

    robots_cache = RobotsCache(user_agent=user_agent, session=session)

    results: List[Dict[str, Any]] = []
    today_str = datetime.date.today().isoformat()

    last_request_time = 0.0

    browser_fallback_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    for idx, item in enumerate(sources_to_process, 1):
        source_id = item.get("id", f"source_{idx}")
        title = item.get("title", "")
        org = item.get("organisation", "")
        url = item.get("url", "")
        stype = item.get("type", "web").strip().lower()
        topic = item.get("topic", "")
        keep_pages = item.get("keep_pages", "")

        print(f"[{idx}/{len(sources_to_process)}] Processing: {source_id} ({stype.upper()})")
        print(f"     URL: {url}")

        raw_filename = f"{source_id}.pdf" if stype == "pdf" else f"{source_id}.html"
        raw_path = os.path.join(raw_dir, raw_filename)

        if not url:
            # Check if a manual local raw file already exists
            if os.path.exists(raw_path) and os.path.getsize(raw_path) > 0:
                print(f"  [Notice] Missing URL, but found existing local raw file at '{raw_path}'. Extracting...")
            else:
                print("  [Failed] Missing URL.")
                results.append({
                    "id": source_id,
                    "title": title,
                    "organisation": org,
                    "url": url,
                    "date_accessed": today_str,
                    "status": "failed (missing url)",
                    "character_count": 0,
                })
                continue

        # Respect rate-limiting delay between network requests
        elapsed = time.time() - last_request_time
        if elapsed < delay and idx > 1:
            wait_time = delay - elapsed
            time.sleep(wait_time)

        # Check robots.txt for web items
        if respect_robots and stype == "web" and url:
            try:
                allowed = robots_cache.is_allowed(url)
                if not allowed:
                    print(f"  [Failed] Blocked by robots.txt: {url}")
                    results.append({
                        "id": source_id,
                        "title": title,
                        "organisation": org,
                        "url": url,
                        "date_accessed": today_str,
                        "status": "failed (disallowed by robots.txt)",
                        "character_count": 0,
                    })
                    continue
            except Exception as e:
                print(f"  [robots.txt note] Error checking robots.txt: {e}")

        # Execute download and extraction
        download_success = False
        try:
            if url:
                last_request_time = time.time()
                req_timeout = 120 if stype == "pdf" else 35

                try:
                    resp = session.get(url, timeout=req_timeout, stream=True)
                except requests.exceptions.SSLError as ssl_err:
                    print(f"  [SSL Warning] SSL verification failed ({ssl_err}). Retrying with verify=False...")
                    resp = session.get(url, timeout=req_timeout, stream=True, verify=False)

                # If 403 Forbidden with custom User-Agent, retry with standard desktop browser headers
                if resp.status_code == 403:
                    print("  [Notice] Received 403 Forbidden with bot User-Agent; retrying with standard browser headers...")
                    resp = requests.get(url, headers=browser_fallback_headers, timeout=req_timeout, stream=True)

                resp.raise_for_status()

                if stype == "pdf":
                    with open(raw_path, "wb") as rf:
                        for chunk in resp.iter_content(chunk_size=65536):
                            if chunk:
                                rf.write(chunk)
                else:
                    with open(raw_path, "w", encoding="utf-8", errors="replace") as rf:
                        rf.write(resp.text)

                download_success = True

        except Exception as exc:
            print(f"  [Network Error] Could not download from {url}: {exc}")

        # If download failed or URL was empty, check if user provided a manual file in knowledge_base/raw/
        try:
            if not download_success:
                if os.path.exists(raw_path) and os.path.getsize(raw_path) > 0:
                    print(f"  [Fallback] Utilizing manually saved local file at '{raw_path}'")
                else:
                    raise RuntimeError(f"Download failed and no local raw file found at '{raw_path}'")

            # Extract content from raw file
            if stype == "pdf":
                with open(raw_path, "rb") as rf:
                    pdf_bytes = rf.read()
                markdown_body = extract_pdf_to_markdown(pdf_bytes, keep_pages)
            else:
                with open(raw_path, "r", encoding="utf-8", errors="replace") as rf:
                    html_content = rf.read()
                markdown_body = extract_web_to_markdown(html_content)

            char_count = len(markdown_body)

            # Prepend YAML Front Matter
            meta = {
                "title": title,
                "organisation": org,
                "url": url,
                "topic": topic,
                "date_accessed": today_str,
            }
            front_matter = make_yaml_front_matter(meta)
            full_markdown = front_matter + "\n" + markdown_body

            clean_path = os.path.join(clean_dir, f"{source_id}.md")
            with open(clean_path, "w", encoding="utf-8") as cf:
                cf.write(full_markdown)

            status_str = "ok" if download_success else "ok (from local raw file)"
            print(f"  [OK] Saved raw & clean markdown. Char count: {char_count:,}")

            results.append({
                "id": source_id,
                "title": title,
                "organisation": org,
                "url": url,
                "date_accessed": today_str,
                "status": status_str,
                "character_count": char_count,
            })

        except Exception as exc:
            err_msg = str(exc)
            results.append({
                "id": source_id,
                "title": title,
                "organisation": org,
                "url": url,
                "date_accessed": today_str,
                "status": f"failed ({type(exc).__name__}: {err_msg})",
                "character_count": 0,
            })

    # Write knowledge_base/sources.csv
    sources_summary_path = os.path.join(output_dir, "sources.csv")
    csv_fields = ["id", "title", "organisation", "url", "date_accessed", "status", "character_count"]
    with open(sources_summary_path, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=csv_fields)
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    # Calculate summary metrics
    ok_count = sum(1 for r in results if r["status"] == "ok")
    failed_count = sum(1 for r in results if r["status"] != "ok")
    total_chars = sum(r["character_count"] for r in results)

    print("\n" + "=" * 70)
    print("COLLECTION SUMMARY")
    print("=" * 70)
    print(f"Total Sources Processed: {len(results)}")
    print(f"Number OK:               {ok_count}")
    print(f"Number Failed:           {failed_count}")
    print(f"Total Characters:        {total_chars:,}")
    print(f"Metadata Log Written To: {sources_summary_path}")

    # Identify 3 shortest files
    successful_sources = [r for r in results if r["status"] == "ok"]
    if successful_sources:
        shortest_3 = sorted(successful_sources, key=lambda x: x["character_count"])[:3]
        print("\nThree Shortest Extracted Files (Check for truncation/blocking):")
        for rank, item in enumerate(shortest_3, 1):
            print(
                f"  {rank}. [{item['id']}] '{item['title']}' - "
                f"{item['character_count']:,} characters"
            )
            if item["character_count"] < 600:
                print("     --> Notice: Very low character count. Page may require JavaScript or redirected.")
    else:
        print("\nNo sources were successfully extracted.")
    print("=" * 70 + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="EquiRisk RAG Data Collector - Build knowledge base from web pages and PDFs."
    )
    parser.add_argument(
        "--sources",
        default="sources_list.csv",
        help="Path to CSV file with source URLs and metadata (default: sources_list.csv)",
    )
    parser.add_argument(
        "--output-dir",
        default="knowledge_base",
        help="Target directory for raw and clean knowledge base files (default: knowledge_base)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List sources that would be downloaded without performing any downloads.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Politeness delay in seconds between HTTP requests (default: 2.0)",
    )
    parser.add_argument(
        "--user-agent",
        default=DEFAULT_USER_AGENT,
        help="Custom User-Agent header for HTTP requests.",
    )
    parser.add_argument(
        "--ignore-robots",
        action="store_true",
        help="Bypass robots.txt check (default is to respect robots.txt).",
    )

    args = parser.parse_args()

    process_sources(
        sources_path=args.sources,
        output_dir=args.output_dir,
        dry_run=args.dry_run,
        delay=args.delay,
        user_agent=args.user_agent,
        respect_robots=not args.ignore_robots,
    )


if __name__ == "__main__":
    main()
