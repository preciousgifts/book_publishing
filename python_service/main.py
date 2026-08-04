from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import io
import json
import asyncio
import logging

from utils.logger import setup_logging, project_id_var, log_history, log_subscribers
from config import PORT, HOST
from pipeline.agents.architect import ArchitectAgent
from pipeline.agents.writer import WriterAgent
from pipeline.agents.editor import EditorAgent
from pipeline.agents.critique import CritiqueAgent
from pipeline.exporters.docx_exporter import build_docx
from pipeline.exporters.pdf_exporter import build_pdf
from pipeline.manuscript_parser import parse_manuscript_file

# Initialize custom logging configurations
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="PublishFlow AI Python Swarm Worker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schemas
class OutlineRequest(BaseModel):
    projectId: str
    prompt: str
    genre: str
    tone: Optional[str] = None
    title: Optional[str] = "Untitled Book"
    languageLocale: Optional[str] = "en-US"

class WriteChapterRequest(BaseModel):
    projectId: str
    chapterIndex: int
    summary: str
    discoveryAnswers: Dict[str, Any] = {}
    languageLocale: str = "en-US"
    genre: str = "non-fiction"

class ParagraphData(BaseModel):
    chapterIndex: int
    paragraphIndex: int
    formattedHtml: str

class ExportRequest(BaseModel):
    projectId: str
    title: str
    trimSize: str = "6x9"
    paragraphs: List[ParagraphData]

class AdjustOutlineRequest(BaseModel):
    projectId: str
    action: str
    targetChapterCount: Optional[int] = None
    feedback: Optional[str] = None
    currentToC: List[Dict[str, Any]]

@app.post("/internal/swarm/outline")
async def generate_outline(payload: OutlineRequest):
    token = project_id_var.set(payload.projectId)
    logger.info(f"[ARCHITECT] Initializing ToC outline generation for book: {payload.title or 'Untitled Book'}")
    try:
        agent = ArchitectAgent()
        result = await agent.design_book(
            title=payload.title or "Untitled Book",
            genre=payload.genre,
            locale=payload.languageLocale or "en-US",
            concept=payload.prompt
        )
        logger.info(f"[ARCHITECT] Outline generated successfully with {len(result.get('toc', []))} chapters.")
        return {
            "toc_data": result.get("toc", []),
            "discovery_questions": result.get("discoveryQuestions", [])
        }
    except Exception as e:
        logger.error(f"[ARCHITECT] Failed to generate outline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        project_id_var.reset(token)

@app.post("/internal/manuscript/parse")
async def parse_manuscript(
    file: UploadFile = File(...),
    title: str = Form(...),
    genre: str = Form(...),
    languageLocale: str = Form("en-US"),
    trimSize: str = Form("6x9")
):
    try:
        file_bytes = await file.read()
        result = await parse_manuscript_file(
            file_bytes=file_bytes,
            filename=file.filename,
            title=title,
            genre=genre,
            locale=languageLocale
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/internal/swarm/adjust-outline")
async def adjust_outline(payload: AdjustOutlineRequest):
    try:
        agent = ArchitectAgent()
        result = await agent.adjust_outline(
            action=payload.action,
            current_toc=payload.currentToC,
            target_count=payload.targetChapterCount,
            feedback=payload.feedback
        )
        return {
            "success": True,
            "tocData": result.get("toc", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/internal/swarm/write-chapter")
async def write_chapter(payload: WriteChapterRequest):
    token = project_id_var.set(payload.projectId)
    ch_num = payload.chapterIndex + 1
    logger.info(f"[WRITER] Starting chapter swarm pipeline for Chapter {ch_num}...")
    try:
        # 1. Run Writer Agent
        logger.info(f"[WRITER] Generating Chapter {ch_num} draft prose...")
        writer = WriterAgent()
        draft = await writer.write_chapter(
            summary=payload.summary,
            discovery_answers=payload.discoveryAnswers,
            locale=payload.languageLocale
        )
        
        # 2. Run Editor Agent
        logger.info(f"[EDITOR] Polishing grammar and word choice flow...")
        editor = EditorAgent()
        edited = await editor.edit_chapter(draft)
        
        # 3. Run Critique Agent (Fact Auditor)
        logger.info(f"[CRITIQUE] Running anti-hallucination verification audit...")
        critique = CritiqueAgent()
        audited, status_flags = await critique.audit_content(edited, payload.genre)
        
        logger.info(f"[CRITIQUE] Audited successfully. Flagged {len(status_flags)} assertions as unverified.")
        return {
            "chapter_index": payload.chapterIndex,
            "prose": audited,
            "status_flags": status_flags
        }
    except Exception as e:
        logger.error(f"[WRITER] Chapter write pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        project_id_var.reset(token)

@app.get("/internal/logs/{projectId}")
async def stream_logs(projectId: str):
    """
    Exposes a real-time Server-Sent Events (SSE) stream of colorized log entries
    associated with the given projectId.
    """
    async def log_generator():
        # First send historical backlog
        if projectId in log_history:
            for log in log_history[projectId]:
                yield f"data: {json.dumps(log)}\n\n"
                
        # Subscribe to future logs
        queue = asyncio.Queue()
        if projectId not in log_subscribers:
            log_subscribers[projectId] = []
        log_subscribers[projectId].append(queue)
        
        try:
            while True:
                log_entry = await queue.get()
                yield f"data: {json.dumps(log_entry)}\n\n"
                queue.task_done()
        except asyncio.CancelledError:
            # Cleanup on client disconnect
            if projectId in log_subscribers and queue in log_subscribers[projectId]:
                log_subscribers[projectId].remove(queue)
                if not log_subscribers[projectId]:
                    del log_subscribers[projectId]
                    
    return StreamingResponse(log_generator(), media_type="text/event-stream")

@app.post("/internal/export/docx")
async def export_docx(payload: ExportRequest):
    try:
        paragraphs_list = [
            {
                "chapterIndex": p.chapterIndex,
                "paragraphIndex": p.paragraphIndex,
                "formattedHtml": p.formattedHtml
            } for p in payload.paragraphs
        ]
        
        doc = build_docx(paragraphs_list, payload.trimSize)
        
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        
        filename = f"exported_project_{payload.projectId}.docx"
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/internal/export/pdf")
async def export_pdf(payload: ExportRequest):
    try:
        paragraphs_list = [
            {
                "chapterIndex": p.chapterIndex,
                "paragraphIndex": p.paragraphIndex,
                "formattedHtml": p.formattedHtml
            } for p in payload.paragraphs
        ]
        
        file_stream = io.BytesIO()
        build_pdf(file_stream, paragraphs_list, payload.title, payload.trimSize)
        file_stream.seek(0)
        
        filename = f"exported_project_{payload.projectId}.pdf"
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
