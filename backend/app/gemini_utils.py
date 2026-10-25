"""Small helpers shared by the Gemini diagnostic and health endpoint."""

from __future__ import annotations

from typing import Any


def list_generate_content_models(client: Any) -> list[str]:
    """Return models advertised by the key that support generateContent."""
    names = []
    for model in client.models.list():
        name = str(getattr(model, "name", "")).removeprefix("models/")
        actions = getattr(model, "supported_actions", None) or getattr(model, "supported_generation_methods", None) or []
        if name and "generateContent" in actions:
            names.append(name)
    return names


def choose_flash_model(models: list[str], configured: str | None = None) -> str:
    """Honor GEMINI_MODEL when present; otherwise choose an advertised flash model."""
    configured = (configured or "").strip().removeprefix("models/")
    if configured:
        if configured in models:
            return configured
        raise ValueError(f"Configured GEMINI_MODEL {configured!r} is unavailable or does not support generateContent")
    for model in models:
        if "flash" in model.lower():
            return model
    raise ValueError("No flash model supporting generateContent is available to this key")


def probe_gemini(api_key: str, configured_model: str | None = None) -> dict[str, Any]:
    """List available models and make a one-token generateContent request."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    models = list_generate_content_models(client)
    model = choose_flash_model(models, configured_model)
    response = client.models.generate_content(
        model=model,
        contents="Reply with one word.",
        config=types.GenerateContentConfig(max_output_tokens=1, temperature=0),
    )
    usage = getattr(response, "usage_metadata", None)
    return {
        "models": models,
        "model": model,
        "succeeded": bool(getattr(response, "candidates", None)),
        "tokens": {
            "prompt": getattr(usage, "prompt_token_count", None) if usage else None,
            "output": getattr(usage, "candidates_token_count", None) if usage else None,
            "total": getattr(usage, "total_token_count", None) if usage else None,
        },
    }


def redact_api_key(message: str, api_key: str | None) -> str:
    """Keep diagnostic errors useful without allowing credentials into logs."""
    return message.replace(api_key, "[REDACTED]") if api_key else message
