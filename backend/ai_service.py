
import ollama


MODEL_NAME = "qwen2.5:7b"


def ask_local_ai(prompt: str, dataset_context: str | None = None) -> str:
    """Answer general or uploaded-dataset questions using local Qwen."""

    system_message = (
        "You are an assistant for a container vessel stowage planning system. "
        "Give clear, concise answers. Never claim that a stowage plan is "
        "physically valid unless the Python placement engine has validated it. "
        "When UPLOADED DATASET CONTEXT is provided, treat it as the only source "
        "of truth for questions about uploaded containers, ports, weights, "
        "sizes, reefer/hazardous flags, destination order, and slot assignments. "
        "Copy exact values from the context. Never invent or estimate a value. "
        "If the requested information is not present, say that it is not "
        "available in the uploaded dataset or generated plan."
    )

    user_message = prompt
    if dataset_context:
        user_message = (
            f"QUESTION:\n{prompt}\n\n"
            f"UPLOADED DATASET CONTEXT:\n{dataset_context}"
        )

    response = ollama.chat(
        model=MODEL_NAME,
        options={
            "temperature": 0,
        },
        messages=[
            {
                "role": "system",
                "content": system_message,
            },
            {
                "role": "user",
                "content": user_message,
            },
        ],
    )

    return response.message.content


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
