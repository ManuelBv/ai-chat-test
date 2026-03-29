"""Tests for message feedback (thumbs up/down with reasons)."""

from __future__ import annotations

from httpx import AsyncClient


async def _send_and_get_assistant_message(client: AsyncClient, conv_id: str) -> dict:
    """Send a prompt and return the assistant message from the conversation."""
    await client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "What is this about?"},
    )
    res = await client.get(f"/api/conversations/{conv_id}/messages")
    messages = res.json()
    return next(m for m in messages if m["role"] == "assistant")


async def test_submit_thumbs_up(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_up"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["feedback"] == "thumbs_up"
    assert data["feedback_reason"] is None


async def test_submit_thumbs_down_with_reason(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_down", "feedback_reason": "not_in_document"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["feedback"] == "thumbs_down"
    assert data["feedback_reason"] == "not_in_document"


async def test_feedback_persists_on_message_list(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_down", "feedback_reason": "citation_wrong"},
    )

    res = await client.get(f"/api/conversations/{conversation['id']}/messages")
    messages = res.json()
    assistant = next(m for m in messages if m["role"] == "assistant")
    assert assistant["feedback"] == "thumbs_down"
    assert assistant["feedback_reason"] == "citation_wrong"


async def test_feedback_rejects_invalid_value(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "love_it"},
    )
    assert res.status_code == 422


async def test_feedback_rejects_invalid_reason(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_down", "feedback_reason": "bad_vibes"},
    )
    assert res.status_code == 422


async def test_feedback_on_nonexistent_message(client: AsyncClient):
    res = await client.patch(
        "/api/messages/nonexistent123/feedback",
        json={"feedback": "thumbs_up"},
    )
    assert res.status_code == 404


async def test_feedback_can_be_changed(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    # First: thumbs up
    await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_up"},
    )

    # Change to thumbs down with reason
    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_down", "feedback_reason": "too_vague"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["feedback"] == "thumbs_down"
    assert data["feedback_reason"] == "too_vague"


async def test_feedback_cleared_when_set_to_none(client: AsyncClient, conversation: dict):
    msg = await _send_and_get_assistant_message(client, conversation["id"])

    await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": "thumbs_up"},
    )

    res = await client.patch(
        f"/api/messages/{msg['id']}/feedback",
        json={"feedback": None},
    )
    assert res.status_code == 200
    assert res.json()["feedback"] is None
