from __future__ import annotations

import os
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import FileResponse

from takehome.db.session import get_session
from takehome.services.conversation import get_conversation
from takehome.services.document import delete_document, get_document, upload_document

SAMPLE_DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "sample-docs")

logger = structlog.get_logger()

router = APIRouter(tags=["documents"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #


class DocumentOut(BaseModel):
    id: str
    conversation_id: str
    filename: str
    page_count: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.post(
    "/api/conversations/{conversation_id}/documents",
    response_model=DocumentOut,
    status_code=201,
)
async def upload_document_endpoint(
    conversation_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Upload a PDF document for a conversation."""
    # Verify the conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        document = await upload_document(session, conversation_id, file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None

    logger.info(
        "Document uploaded",
        conversation_id=conversation_id,
        document_id=document.id,
        filename=document.filename,
    )

    return DocumentOut(
        id=document.id,
        conversation_id=document.conversation_id,
        filename=document.filename,
        page_count=document.page_count,
        uploaded_at=document.uploaded_at,
    )


@router.get("/api/documents/{document_id}/content")
async def serve_document_file(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve the raw PDF file for download/viewing."""
    document = await get_document(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=document.file_path,
        filename=document.filename,
        media_type="application/pdf",
    )


@router.get("/api/sample-documents")
async def list_sample_documents() -> list[str]:
    """List available sample documents."""
    abs_dir = os.path.abspath(SAMPLE_DOCS_DIR)
    if not os.path.isdir(abs_dir):
        return []
    return sorted(f for f in os.listdir(abs_dir) if f.lower().endswith(".pdf"))


@router.post(
    "/api/conversations/{conversation_id}/sample-document",
    response_model=DocumentOut,
    status_code=201,
)
async def load_sample_document(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentOut:
    """Load the sample title report into a conversation for onboarding."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    sample_name = "title-report-lot-7.pdf"
    sample_path = os.path.join(os.path.abspath(SAMPLE_DOCS_DIR), sample_name)
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample document not found")

    # Create an UploadFile-like object from the sample
    with open(sample_path, "rb") as f:
        content = f.read()

    from io import BytesIO

    from fastapi import UploadFile as UF

    fake_upload = UF(filename=sample_name, file=BytesIO(content), headers={"content-type": "application/pdf"})
    try:
        document = await upload_document(session, conversation_id, fake_upload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None

    return DocumentOut(
        id=document.id,
        conversation_id=document.conversation_id,
        filename=document.filename,
        page_count=document.page_count,
        uploaded_at=document.uploaded_at,
    )


@router.delete("/api/documents/{document_id}", status_code=204)
async def delete_document_endpoint(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document and its file from disk."""
    deleted = await delete_document(session, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
