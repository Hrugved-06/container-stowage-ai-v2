

import io
import json
import pandas as pd

from docx import Document
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.voyage_simulation import simulate_voyage
from backend.vessel_layout import create_vessel_layout
from backend.ai_service import ask_local_ai
from backend.models import CargoManifest
from backend.slots import VesselSlotPlan
from backend.placement import create_stowage_plan



app = FastAPI(
    title="AI-Driven Container Vessel Cargo Scheduling and Voyage Planning System",
    description="Local AI-assisted container stowage and voyage planning.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlanningRequest(BaseModel):
    manifest: CargoManifest
    vessel: VesselSlotPlan | None = None
    use_ai: bool = False

class VoyageSimulationRequest(BaseModel):
    manifest: CargoManifest
    port_sequence: list[str] = Field(min_length=2)
    vessel: VesselSlotPlan | None = None

@app.get("/")
def home():
    return {
        "message": "Container Stowage API is running",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "container-stowage-api",
        "ai_runtime": "Ollama",
    }


@app.post("/api/plan")
def generate_plan(request: PlanningRequest):
    if not request.manifest.containers:
        raise HTTPException(
            status_code=400,
            detail="Cargo manifest cannot be empty.",
        )

    try:
        vessel = request.vessel or create_vessel_layout()

        return create_stowage_plan(
            request.manifest,
            vessel,
            use_ai=request.use_ai,
        )        
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

from pydantic import BaseModel, Field


class AIQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@app.post("/api/ai/ask")
def ask_ai(request: AIQuestion):
    try:
        answer = ask_local_ai(request.question)
        return {
            "model": "qwen2.5:7b",
            "answer": answer,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Local AI service unavailable: {exc}",
        ) from exc


@app.post("/api/manifest/upload")
async def upload_manifest(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()

    try:
        content = await file.read()

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            raise HTTPException(
                status_code=400,
                detail="Upload a CSV (.csv) or Excel (.xlsx) file.",
            )

        required_columns = [
            "container_id",
            "size_ft",
            "weight_kg",
            "loading_port",
            "discharge_port",
        ]

        missing = [
            column for column in required_columns
            if column not in df.columns
        ]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing)}",
            )

        df = df.where(pd.notna(df), None)       

        return {
            "filename": file.filename,
            "total_rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(10).to_dict(orient="records"),
            "containers": df.to_dict(orient="records"),
            "message": "File uploaded and required columns checked.",
        }


    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read the uploaded file: {exc}",
        )
    finally:
        await file.close()

@app.post("/api/voyage/simulate")
def simulate_voyage_endpoint(request: VoyageSimulationRequest):
    vessel = request.vessel or create_vessel_layout()

    return simulate_voyage(
        manifest=request.manifest,
        vessel=vessel,
        port_sequence=request.port_sequence,
    )




def _plan_assignments_dataframe(plan: dict) -> pd.DataFrame:
    assignments = plan.get("assignments", [])

    rows = []
    for item in assignments:
        rows.append({
            "container_id": item.get("container_id", ""),
            "slot_id": item.get("slot_id", ""),
            "position_code": item.get("position_code", ""),
            "bay": item.get("bay", ""),
            "row": item.get("row", ""),
            "tier": item.get("tier", ""),
            "size_ft": item.get("size_ft", ""),
            "selection_mode": item.get("selection_mode", ""),
            "assignment_reason": item.get("assignment_reason", ""),
        })

    return pd.DataFrame(rows)


@app.post("/api/plan/export/{file_format}")
def export_plan(
    file_format: str,
    plan: dict = Body(...),
):
    """Export the current generated stowage plan without storing it."""

    file_format = file_format.lower()
    supported = {"csv", "xlsx", "json", "docx", "pdf"}

    if file_format not in supported:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: csv, xlsx, json, docx, pdf.",
        )

    df = _plan_assignments_dataframe(plan)
    base_name = "stowage_plan"

    if file_format == "csv":
        content = df.to_csv(index=False).encode("utf-8")
        media_type = "text/csv"
        filename = f"{base_name}.csv"

    elif file_format == "xlsx":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Assignments")

            summary = pd.DataFrame([
                ["Vessel ID", plan.get("vessel_id", "")],
                ["Assigned containers", plan.get("assigned_count", 0)],
                ["Unassigned containers", plan.get("unassigned_count", 0)],
                ["Estimated rehandles", plan.get("estimated_rehandles", 0)],
                ["AI proposals", plan.get("ai_proposed_count", 0)],
                ["AI accepted", plan.get("ai_accepted_count", 0)],
                ["AI fallbacks", plan.get("ai_fallback_count", 0)],
            ], columns=["Metric", "Value"])
            summary.to_excel(writer, index=False, sheet_name="Summary")

        content = buffer.getvalue()
        media_type = (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        filename = f"{base_name}.xlsx"

    elif file_format == "json":
        content = json.dumps(plan, indent=2, default=str).encode("utf-8")
        media_type = "application/json"
        filename = f"{base_name}.json"

    elif file_format == "docx":
        document = Document()
        document.add_heading(
            "AI-Driven Container Vessel Cargo Scheduling and Voyage Planning System",
            level=1,
        )
        document.add_heading("Saved Stowage Plan", level=2)

        document.add_paragraph(
            f"Vessel ID: {plan.get('vessel_id', '')}"
        )
        document.add_paragraph(
            f"Assigned containers: {plan.get('assigned_count', 0)}"
        )
        document.add_paragraph(
            f"Unassigned containers: {plan.get('unassigned_count', 0)}"
        )
        document.add_paragraph(
            f"Estimated rehandles: {plan.get('estimated_rehandles', 0)}"
        )

        if not df.empty:
            table = document.add_table(rows=1, cols=len(df.columns))
            table.style = "Table Grid"

            for index, column in enumerate(df.columns):
                table.rows[0].cells[index].text = str(column)

            for _, row in df.fillna("").iterrows():
                cells = table.add_row().cells
                for index, value in enumerate(row):
                    cells[index].text = str(value)

        buffer = io.BytesIO()
        document.save(buffer)
        content = buffer.getvalue()
        media_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        filename = f"{base_name}.docx"

    else:
        buffer = io.BytesIO()
        pdf = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=10 * mm,
            leftMargin=10 * mm,
            topMargin=10 * mm,
            bottomMargin=10 * mm,
        )
        styles = getSampleStyleSheet()
        story = [
            Paragraph(
                "AI-Driven Container Vessel Cargo Scheduling and Voyage Planning System",
                styles["Title"],
            ),
            Spacer(1, 6),
            Paragraph("Saved Stowage Plan", styles["Heading2"]),
            Spacer(1, 6),
            Paragraph(
                (
                    f"Vessel: {plan.get('vessel_id', '')} &nbsp;&nbsp; "
                    f"Assigned: {plan.get('assigned_count', 0)} &nbsp;&nbsp; "
                    f"Unassigned: {plan.get('unassigned_count', 0)} &nbsp;&nbsp; "
                    f"Estimated rehandles: {plan.get('estimated_rehandles', 0)}"
                ),
                styles["BodyText"],
            ),
            Spacer(1, 10),
        ]

        if not df.empty:
            pdf_columns = [
                "container_id",
                "position_code",
                "size_ft",
                "selection_mode",
                "assignment_reason",
            ]
            pdf_df = df[pdf_columns].fillna("")
            table_data = [pdf_columns] + pdf_df.astype(str).values.tolist()
            table = Table(
                table_data,
                repeatRows=1,
                colWidths=[32 * mm, 28 * mm, 18 * mm, 32 * mm, 125 * mm],
            )
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                    colors.white,
                    colors.HexColor("#f8fafc"),
                ]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(table)
        else:
            story.append(
                Paragraph("No assignments available in this plan.", styles["BodyText"])
            )

        pdf.build(story)
        content = buffer.getvalue()
        media_type = "application/pdf"
        filename = f"{base_name}.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@app.get("/api/vessel/layout")
def get_vessel_layout():
    vessel = create_vessel_layout()
    return vessel.model_dump()

