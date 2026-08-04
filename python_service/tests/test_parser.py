import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from pipeline.manuscript_parser import parse_manuscript_file

client = TestClient(app)

@pytest.mark.asyncio
@patch("pipeline.manuscript_parser.AuditorAgent")
async def test_parse_manuscript_file_text(mock_auditor_class):
    # Mock auditor agent response
    mock_auditor = AsyncMock()
    mock_auditor.audit_manuscript.return_value = {
        "healthReport": "### Health Report\nPacing looks great.",
        "toc": [
            {"chapterNumber": 1, "title": "Chapter 1: Introduction", "summary": "Start of text", "subtopics": []}
        ]
    }
    mock_auditor_class.return_value = mock_auditor

    text_content = """Chapter 1: Introduction
This is the first paragraph.
This is the second paragraph.

Chapter 2: Scaling Up
More text for the second chapter.
"""
    result = await parse_manuscript_file(
        file_bytes=text_content.encode("utf-8"),
        filename="manuscript.txt",
        title="My Custom Text Book",
        genre="non-fiction",
        locale="en-US"
    )

    assert result["healthReport"] == "### Health Report\nPacing looks great."
    assert len(result["toc"]) == 1
    assert result["toc"][0]["title"] == "Chapter 1: Introduction"
    # We should have paragraphs parsed
    assert len(result["paragraphs"]) == 3
    assert result["paragraphs"][0]["rawContent"] == "This is the first paragraph."

@pytest.mark.asyncio
@patch("main.parse_manuscript_file")
async def test_fastapi_parse_manuscript_endpoint(mock_parse_file):
    mock_parse_file.return_value = {
        "healthReport": "Audit report text",
        "toc": [{"chapterNumber": 1, "title": "Chapter 1", "summary": "...", "subtopics": []}],
        "paragraphs": [{"chapterIndex": 1, "paragraphIndex": 0, "rawContent": "...", "formattedHtml": "..."}]
    }

    response = client.post(
        "/internal/manuscript/parse",
        data={"title": "Uploaded Book", "genre": "fiction", "languageLocale": "en-US", "trimSize": "6x9"},
        files={"file": ("manuscript.txt", b"Chapter 1\nHello world", "text/plain")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["healthReport"] == "Audit report text"
    assert len(data["toc"]) == 1

@pytest.mark.asyncio
@patch("main.ArchitectAgent")
async def test_fastapi_adjust_outline_endpoint(mock_architect_class):
    mock_architect = AsyncMock()
    mock_architect.adjust_outline.return_value = {
        "toc": [
            {"chapterNumber": 1, "title": "Expanded Chapter 1", "summary": "...", "subtopics": []}
        ]
    }
    mock_architect_class.return_value = mock_architect

    payload = {
        "projectId": "3f8b9d3b-0bb5-4f35-86ff-94b12d5df835",
        "action": "expand",
        "targetChapterCount": 2,
        "feedback": "make it longer",
        "currentToC": [{"chapterNumber": 1, "title": "Chapter 1", "summary": "..."}]
    }

    response = client.post("/internal/swarm/adjust-outline", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["tocData"][0]["title"] == "Expanded Chapter 1"
