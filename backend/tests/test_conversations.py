"""Tests for conversation CRUD operations."""

from __future__ import annotations

from httpx import AsyncClient


async def test_create_conversation(client: AsyncClient):
    res = await client.post("/api/conversations")
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["title"] == "New Conversation"
    assert data["has_document"] is False
    assert data["documents"] == []


async def test_list_conversations(client: AsyncClient):
    # Create two conversations
    await client.post("/api/conversations")
    await client.post("/api/conversations")

    res = await client.get("/api/conversations")
    assert res.status_code == 200
    assert len(res.json()) >= 2


async def test_get_conversation(client: AsyncClient, conversation: dict):
    res = await client.get(f"/api/conversations/{conversation['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == conversation["id"]


async def test_get_nonexistent_conversation(client: AsyncClient):
    res = await client.get("/api/conversations/nonexistent123")
    assert res.status_code == 404


async def test_update_conversation_title(client: AsyncClient, conversation: dict):
    res = await client.patch(
        f"/api/conversations/{conversation['id']}",
        json={"title": "Updated Title"},
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Title"


async def test_delete_conversation(client: AsyncClient, conversation: dict):
    res = await client.delete(f"/api/conversations/{conversation['id']}")
    assert res.status_code == 204

    # Verify it's gone
    res = await client.get(f"/api/conversations/{conversation['id']}")
    assert res.status_code == 404


async def test_delete_conversation_cascades_documents(client: AsyncClient, conversation: dict):
    """Deleting a conversation should also delete its documents."""
    conv_id = conversation["id"]

    # Upload a document
    pdf_content = b"""%PDF-1.0
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
    upload_res = await client.post(
        f"/api/conversations/{conv_id}/documents",
        files={"file": ("lease.pdf", pdf_content, "application/pdf")},
    )
    doc_id = upload_res.json()["id"]

    # Delete the conversation
    await client.delete(f"/api/conversations/{conv_id}")

    # Document endpoint should 404
    doc_res = await client.get(f"/api/documents/{doc_id}/content")
    assert doc_res.status_code == 404
