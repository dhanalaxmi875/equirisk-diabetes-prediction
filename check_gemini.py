"""Safe Phase 0 diagnostic for the same Gemini environment used by the backend."""

from __future__ import annotations

import os
import time
from pathlib import Path

BACKEND_ENV = Path(__file__).resolve().parent / "backend" / ".env"

def safe_error(error: BaseException, api_key: str | None) -> str:
    message = str(error)
    if api_key:
        message = message.replace(api_key, "[REDACTED]")
    return f"{type(error).__name__}: {message}"


def main() -> int:
    try:
        from dotenv import load_dotenv
        load_dotenv(BACKEND_ENV, override=False)
    except Exception as error:
        print(f"Key configured: {bool(os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY'))}")
        print(f"Key length: {len(os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or '')}")
        print(f"Environment file: {BACKEND_ENV}")
        print("Models available: unavailable (python-dotenv could not be imported)")
        print("Call succeeded: False")
        print(f"Exact error: {safe_error(error, None)}")
        return 1

    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    print(f"Key configured: {bool(key)}")
    print(f"Key length: {len(key) if key else 0}")
    print(f"Environment file: {BACKEND_ENV}")
    if not key:
        print("Models available: unavailable (no API key)")
        print("Call succeeded: False")
        print("Exact error: No GEMINI_API_KEY or GOOGLE_API_KEY is configured")
        return 1

    try:
        from google import genai
        from google.genai import types
        from backend.app.gemini_utils import list_generate_content_models, choose_flash_model
    except Exception as error:
        print("Models available: unavailable (google-genai SDK could not be imported)")
        print("Call succeeded: False")
        print(f"Exact error: {safe_error(error, key)}")
        return 1

    try:
        client = genai.Client(api_key=key)
        models = list_generate_content_models(client)
        print(f"Models available for generateContent: {', '.join(models) if models else '(none)'}")
        model = choose_flash_model(models, os.getenv("GEMINI_MODEL"))
        started = time.perf_counter()
        try:
            response = client.models.generate_content(
                model=model,
                contents="Reply with one word.",
                config=types.GenerateContentConfig(max_output_tokens=1, temperature=0),
            )
            latency = (time.perf_counter() - started) * 1000
            usage = getattr(response, "usage_metadata", None)
            print(f"Model used: {model}")
            succeeded = bool(getattr(response, "candidates", None))
            print(f"Call succeeded: {succeeded}")
            print(f"Latency: {latency:.1f} ms")
            if usage:
                print("Token usage: " + ", ".join(
                    f"{label}={getattr(usage, attr, 'unavailable')}"
                    for label, attr in (("prompt", "prompt_token_count"), ("output", "candidates_token_count"), ("total", "total_token_count"))
                ))
            else:
                print("Token usage: unavailable")
            if not succeeded:
                print("Exact error: SDK returned no candidate content")
                return 1
            return 0
        except Exception as error:
            latency = (time.perf_counter() - started) * 1000
            print(f"Model used: {model}")
            print("Call succeeded: False")
            print(f"Latency: {latency:.1f} ms")
            print(f"Exact error: {safe_error(error, key)}")
            return 1
    except Exception as error:
        print("Model used: unavailable")
        print("Call succeeded: False")
        print("Latency: unavailable")
        print(f"Exact error: {safe_error(error, key)}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
