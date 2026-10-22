
import json
from unittest.mock import patch

from backend.models import CargoManifest, Container
from backend.slots import VesselSlot, VesselSlotPlan
from backend.placement import create_stowage_plan

manifest = CargoManifest(containers=[
    Container(
        container_id=f"TEST-{i}",
        size_ft=20,
        weight_kg=12000,
        loading_port="JNPT",
        discharge_port="Singapore",
        destination_order=i,
    )
    for i in (1, 2)
])

vessel = VesselSlotPlan(
    vessel_id="TEST-VESSEL",
    slots=[
        VesselSlot(
            slot_id=f"{bay:02d}00{tier:02d}",
            bay=bay,
            row=0,
            tier=tier,
            location="hold",
            max_weight_kg=30000,
            supported_sizes_ft=[20],
        )
        for bay, tier in [(1, 2), (2, 2), (2, 4)]
    ],
)

def fake_qwen(prompt):
    data = json.loads(prompt)
    placements = []

    for container in data["containers"]:
        ci = container["container_ref"]
        desired_tier = 2 if ci == 0 else 4

        for slot in container["candidate_slots"]:
            if slot["bay"] == 2 and slot["tier"] == desired_tier:
                placements.append({
                    "container_ref": ci,
                    "slot_ref": slot["slot_ref"],
                })
                break

    return json.dumps({"placements": placements})

with patch(
    "backend.placement.propose_container_placements",
    side_effect=fake_qwen,
):
    result = create_stowage_plan(
        manifest, vessel, use_ai=True
    )

print("Selection mode:", result.get("selection_mode"))
print("AI candidate rehandles:", result.get("ai_candidate_rehandles"))
print("Final rehandles:", result["estimated_rehandles"])
print("Assigned:", result["assigned_count"])

assert result["selection_mode"] == "python_baseline_fallback"
assert result["ai_candidate_rehandles"] == 1
assert result["estimated_rehandles"] == 0
assert result["assigned_count"] == 2

print("AI QUALITY FALLBACK TEST: PASS")
