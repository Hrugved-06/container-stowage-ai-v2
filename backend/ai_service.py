import json
import os
from typing import Any

import httpx
import ollama


MODEL_NAME = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

# Optional OpenAI-compatible hosted model fallback.
# Configure these in the deployment environment; never hard-code API keys.
CLOUD_AI_BASE_URL = os.getenv("CLOUD_AI_BASE_URL", "").rstrip("/")
CLOUD_AI_API_KEY = os.getenv("CLOUD_AI_API_KEY", "")
CLOUD_AI_MODEL = os.getenv("CLOUD_AI_MODEL", "")


PROJECT_KNOWLEDGE = """
PROJECT: AI-Driven Container Vessel Cargo Scheduling and Voyage Planning System (V2 academic prototype).

CURRENT IMPLEMENTATION:
- Frontend: React + TypeScript + Vite.
- Backend: Python + FastAPI + Pydantic + Pandas.
- Local LLM: Qwen 2.5 7B through Ollama.
- Cargo manifests can be imported from CSV or Excel (.xlsx).
- The Python placement engine creates the final stowage plan.
- Qwen may propose preferred slots, but Python validates compatibility before accepting a proposal.
- If an AI proposal is unavailable or invalid, deterministic fallback placement keeps planning available.
- The generated synthetic vessel layout contains bay/row/tier positions and is not a certified real-ship model.
- A 40-foot container reserves a two-position footprint; a 20-foot container uses one position.
- Implemented placement checks include position availability, supported size/footprint,
  maximum slot weight, reefer capability, hazardous-cargo permission, and uniqueness of
  occupied physical positions.
- Containers are prioritized by earlier destination/discharge order and then by weight.
- Estimated rehandling is calculated from destination order when later-discharge cargo
  blocks earlier-discharge cargo in the same stack.
- Multi-port voyage simulation follows a user-supplied port sequence and reports loading,
  discharge, and onboard counts at each port.
- Current voyage simulation is not live weather/AIS route optimization.
- The prototype is academic decision-support software, not certified for operational vessel safety.

IMPORTANT ANSWERING RULES:
- Answer normal general-knowledge questions as well as project questions.
- For project questions, use the facts above and any supplied runtime context.
- Never invent a feature that is not implemented.
- Never claim that the synthetic plan proves real-world ship stability, structural safety,
  lashing compliance, or regulatory certification.
- If asked about current uploaded data or a generated plan, use only the supplied runtime
  context. If that context does not contain the requested value, say that clearly.
- Prefer short, direct answers suitable for a project demonstration/viva unless the user
  explicitly asks for detail.
""".strip()


PROJECT_FALLBACKS = {
    "stowage": (
        "Stowage means the planned placement and arrangement of containers on a vessel. "
        "In this project, the output maps a container to a vessel position represented by "
        "bay, row and tier."
    ),
    "why is stowage important": (
        "Stowage is important because container position affects slot usage, discharge "
        "accessibility, rehandling, special-cargo compatibility and weight distribution. "
        "A good plan reduces unnecessary moves while keeping assignments within the "
        "implemented constraints."
    ),
    "technology": (
        "This V2 prototype uses React, TypeScript and Vite for the frontend; FastAPI, "
        "Python, Pydantic and Pandas for the backend; and Qwen 2.5 7B through Ollama "
        "for local AI assistance."
    ),
    "constraint": (
        "The current placement engine checks physical-position availability, container "
        "size/footprint, slot weight capacity, reefer capability, hazardous-cargo "
        "permission and duplicate occupancy. A 40-ft container reserves two positions."
    ),
    "voyage": (
        "The current voyage module is a multi-port simulation. It uses a user-provided "
        "port sequence and reports what is loaded, discharged and left onboard at each "
        "port. It does not yet optimize a live sea route using AIS or weather."
    ),
    "ai": (
        "Qwen 2.5 7B is used as an assistant and can propose preferred candidate slots. "
        "The Python placement engine remains authoritative: it validates constraints and "
        "uses a deterministic fallback if the AI response is unavailable or invalid."
    ),
    "rehandling": (
        "Estimated rehandling counts cases where a container for a later destination is "
        "stacked above cargo that must be discharged earlier, causing an extra move."
    ),
    "40": (
        "In the current model, a 40-foot container reserves two adjacent vessel positions, "
        "while a 20-foot container uses one position."
    ),
}


def _runtime_context_text(context: dict[str, Any] | None) -> str:
    if not context:
        return "No runtime dataset/plan context was supplied."

    # Keep prompts bounded even when a large manifest is uploaded.
    safe_context = {
        "uploaded_container_count": context.get("uploaded_container_count"),
        "uploaded_containers_sample": context.get("uploaded_containers_sample", [])[:50],
        "latest_plan": context.get("latest_plan"),
    }

    try:
        return json.dumps(safe_context, default=str, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(safe_context)


def _messages(prompt: str, context: dict[str, Any] | None = None) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": PROJECT_KNOWLEDGE,
        },
        {
            "role": "system",
            "content": "RUNTIME PROJECT CONTEXT:\n" + _runtime_context_text(context),
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]


def _ask_ollama(messages: list[dict[str, str]]) -> str:
    response = ollama.chat(
        model=MODEL_NAME,
        options={
            "temperature": 0.2,
            "num_predict": 700,
        },
        messages=messages,
    )
    answer = (response.message.content or "").strip()
    if not answer:
        raise RuntimeError("Ollama returned an empty response.")
    return answer


def _ask_cloud(messages: list[dict[str, str]]) -> str:
    if not (CLOUD_AI_BASE_URL and CLOUD_AI_API_KEY and CLOUD_AI_MODEL):
        raise RuntimeError("Hosted AI fallback is not configured.")

    response = httpx.post(
        f"{CLOUD_AI_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {CLOUD_AI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": CLOUD_AI_MODEL,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 700,
        },
        timeout=45.0,
    )
    response.raise_for_status()
    payload = response.json()

    try:
        answer = payload["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError, TypeError) as exc:
        raise RuntimeError("Hosted AI returned an unexpected response.") from exc

    if not answer:
        raise RuntimeError("Hosted AI returned an empty response.")

    return answer


def _project_fallback(prompt: str, context: dict[str, Any] | None = None) -> str:
    lower = prompt.lower().strip()

    # Runtime questions that can be answered without any LLM.
    if context:
        count = context.get("uploaded_container_count")
        if count is not None and any(
            phrase in lower
            for phrase in [
                "how many container",
                "number of container",
                "containers uploaded",
                "uploaded containers",
            ]
        ):
            return f"The currently connected dataset contains {count} containers."

        latest_plan = context.get("latest_plan")
        if latest_plan and any(
            phrase in lower
            for phrase in [
                "latest plan",
                "stowage plan available",
                "how many assigned",
                "assigned container",
            ]
        ):
            assigned_count = latest_plan.get("assigned_count")
            if assigned_count is None:
                assigned_count = len(latest_plan.get("assignments", []))
            return (
                f"The latest stowage plan is available and contains "
                f"{assigned_count} assigned containers."
            )

    for keyword, answer in PROJECT_FALLBACKS.items():
        if keyword in lower:
            return answer

    return (
        "The local Qwen model is not reachable and no hosted AI model is configured. "
        "I can still answer common project/stowage questions from the built-in project "
        "knowledge, but unrestricted general questions require either Ollama running "
        "locally or a hosted AI provider configured on the deployment."
    )


def ask_ai(prompt: str, context: dict[str, Any] | None = None) -> dict[str, str]:
    """Answer with local Ollama first, then hosted AI, then safe project fallback."""

    messages = _messages(prompt, context)

    try:
        return {
            "provider": "ollama",
            "model": MODEL_NAME,
            "answer": _ask_ollama(messages),
        }
    except Exception:
        pass

    try:
        return {
            "provider": "cloud",
            "model": CLOUD_AI_MODEL,
            "answer": _ask_cloud(messages),
        }
    except Exception:
        return {
            "provider": "project-fallback",
            "model": "built-in-project-knowledge",
            "answer": _project_fallback(prompt, context),
        }


def ask_local_ai(prompt: str) -> str:
    """Backward-compatible wrapper used by older code/tests."""

    return ask_ai(prompt)["answer"]


def propose_container_placements(prompt: str) -> str:
    """Ask the local AI to propose container placement decisions."""

    response = ollama.chat(
        model=MODEL_NAME,
        format="json",
        options={
            "temperature": 0,
            "num_predict": 500,
        },
        messages=[
            {
                "role": "system",
                "content": (
                    "You select container slots from a supplied JSON input. "
                    "Return one JSON object with a placements array. "
                    "Each item must contain integer fields container_ref "
                    "and slot_ref. Copy container_ref only from the "
                    "input containers array. Copy slot_ref only from "
                    "that container's candidate_slots array. "
                    "The input contains exactly five containers, whose "
                    "container_ref values are 0, 1, 2, 3, and 4. "
                    "Never use any other container_ref. "
                    "Never use a slot_ref that is not listed for that "
                    "container. Do not create extra placements. "
                    "Do not include explanations or markdown."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    return response.message.content
