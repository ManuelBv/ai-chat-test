"""Tests for multi-document upload, listing, and deletion."""

from __future__ import annotations

import os
import tempfile

from httpx import AsyncClient


def make_minimal_pdf(filename: str = "test.pdf") -> tuple[str, bytes]:
    """Create a minimal valid PDF in memory."""
    content = b"""%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF"""
    return filename, content


async def test_upload_single_document(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]
    filename, content = make_minimal_pdf("lease.pdf")

    res = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": (filename, content, "application/pdf")},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["filename"] == "lease.pdf"
    assert data["conversation_id"] == conv_id


async def test_upload_multiple_documents(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]

    # Upload first document
    _, content1 = make_minimal_pdf()
    res1 = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content1, "application/pdf")},
    )
    assert res1.status_code == 201

    # Upload second document — should succeed (no longer blocked)
    _, content2 = make_minimal_pdf()
    res2 = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("title-report.pdf", content2, "application/pdf")},
    )
    assert res2.status_code == 201

    # Verify both appear in conversation detail
    detail = await client.get(f"/api/conversations/{conv_id}")
    assert detail.status_code == 200
    data = detail.json()
    assert len(data["documents"]) == 2
    filenames = {d["filename"] for d in data["documents"]}
    assert filenames == {"lease.pdf", "title-report.pdf"}


async def test_upload_three_documents(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]

    for name in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
        _, content = make_minimal_pdf()
        res = await client.post(
            f"/api/conversations/{conv_id}/documents",
            files={"file": (name, content, "application/pdf")},
        )
        assert res.status_code == 201

    detail = await client.get(f"/api/conversations/{conv_id}")
    assert len(detail.json()["documents"]) == 3


async def test_conversation_detail_documents_array(client: AsyncClient, conversation: dict):
    """Verify conversation detail returns documents as an array."""
    conv_id = conversation["id"]

    # No documents yet
    detail = await client.get(f"/api/conversations/{conv_id}")
    data = detail.json()
    assert data["documents"] == []
    assert data["has_document"] is False

    # Add one document
    _, content = make_minimal_pdf()
    await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )

    detail = await client.get(f"/api/conversations/{conv_id}")
    data = detail.json()
    assert len(data["documents"]) == 1
    assert data["has_document"] is True
    assert data["documents"][0]["filename"] == "lease.pdf"


async def test_delete_document(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]

    # Upload a document
    _, content = make_minimal_pdf()
    res = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )
    doc_id = res.json()["id"]

    # Delete it
    del_res = await client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 204

    # Verify it's gone
    detail = await client.get(f"/api/conversations/{conv_id}")
    assert len(detail.json()["documents"]) == 0


async def test_delete_one_of_multiple_documents(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]

    # Upload two documents
    _, content = make_minimal_pdf()
    res1 = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )
    res2 = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("title.pdf", content, "application/pdf")},
    )
    doc1_id = res1.json()["id"]

    # Delete first one
    await client.delete(f"/api/documents/{doc1_id}")

    # Second one remains
    detail = await client.get(f"/api/conversations/{conv_id}")
    docs = detail.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["filename"] == "title.pdf"


async def test_delete_nonexistent_document(client: AsyncClient):
    res = await client.delete("/api/documents/nonexistent123")
    assert res.status_code == 404


async def test_upload_rejects_non_pdf(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]
    res = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("readme.txt", b"hello world", "text/plain")},
    )
    assert res.status_code == 400


async def test_upload_to_nonexistent_conversation(client: AsyncClient):
    _, content = make_minimal_pdf()
    res = await client.post(
        "/api/conversations/nonexistent123/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )
    assert res.status_code == 404


async def test_documents_persist_across_fetches(client: AsyncClient, conversation: dict):
    """Verify documents persist when fetching conversation multiple times."""
    conv_id = conversation["id"]

    _, content = make_minimal_pdf()
    await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )

    # Fetch twice — documents should still be there
    for _ in range(2):
        detail = await client.get(f"/api/conversations/{conv_id}")
        assert len(detail.json()["documents"]) == 1


async def test_conversation_list_has_document_flag(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]

    # Before upload
    res = await client.get("/api/conversations")
    convos = res.json()
    target = next(c for c in convos if c["id"] == conv_id)
    assert target["has_document"] is False

    # After upload
    _, content = make_minimal_pdf()
    await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", content, "application/pdf")},
    )

    res = await client.get("/api/conversations")
    convos = res.json()
    target = next(c for c in convos if c["id"] == conv_id)
    assert target["has_document"] is True


async def test_load_sample_document(client: AsyncClient, conversation: dict):
    conv_id = conversation["id"]
    res = await client.post(f"/api/conversations/{conv_id}/sample-document")
    assert res.status_code == 201
    data = res.json()
    assert data["filename"] == "title-report-lot-7.pdf"
    assert data["conversation_id"] == conv_id
    assert data["page_count"] > 0


async def test_load_sample_to_nonexistent_conversation(client: AsyncClient):
    res = await client.post("/api/conversations/nonexistent123/sample-document")
    assert res.status_code == 404


async def test_list_sample_documents(client: AsyncClient):
    res = await client.get("/api/sample-documents")
    assert res.status_code == 200
    samples = res.json()
    assert isinstance(samples, list)
    assert "title-report-lot-7.pdf" in samples
