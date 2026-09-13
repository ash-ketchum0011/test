"""LLM model provider abstraction for Google ADK.

Swap AI APIs via env (LLM_PROVIDER): emergent | gemini | openai.
Every ADK LlmAgent gets its model from get_model(), so changing provider is
a one-line env change with no code changes elsewhere.
"""
from __future__ import annotations
import os

from google.adk.models.lite_llm import LiteLlm


def get_model() -> LiteLlm:
    provider = os.environ.get("LLM_PROVIDER", "emergent").lower()
    model = os.environ.get("LLM_MODEL", "gpt-5.4")

    if provider == "emergent":
        proxy = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")
        return LiteLlm(model=f"openai/{model}",
                       api_base=f"{proxy}/llm/openai/v1",
                       api_key=os.environ["EMERGENT_LLM_KEY"])
    if provider == "gemini":
        return LiteLlm(model=f"gemini/{model}", api_key=os.environ["GEMINI_API_KEY"])
    if provider == "openai":
        return LiteLlm(model=f"openai/{model}", api_key=os.environ["OPENAI_API_KEY"])
    raise ValueError(f"Unknown LLM_PROVIDER '{provider}' (use emergent | gemini | openai)")
