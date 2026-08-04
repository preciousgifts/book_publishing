import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

# Import FastAPI app from main
from main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("main.ArchitectAgent")
async def test_generate_outline(mock_architect_class):
    # Set up mock instance
    mock_instance = AsyncMock()
    mock_instance.design_book.return_value = {
        "toc": [
            {"chapterNumber": 1, "title": "Introduction to AI", "summary": "Basic concepts"}
        ],
        "discoveryQuestions": ["What is your target audience?"]
    }
    mock_architect_class.return_value = mock_instance

    payload = {
        "projectId": "3f8b9d3b-0bb5-4f35-86ff-94b12d5df835",
        "prompt": "Write a book about artificial intelligence",
        "genre": "non-fiction",
        "tone": "informative",
        "title": "AI Revolution",
        "languageLocale": "en-US"
    }

    response = client.post("/internal/swarm/outline", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "toc_data" in data
    assert "discovery_questions" in data
    assert len(data["toc_data"]) == 1
    assert data["toc_data"][0]["title"] == "Introduction to AI"
    assert data["discovery_questions"][0] == "What is your target audience?"
    mock_instance.design_book.assert_called_once_with(
        title="AI Revolution",
        genre="non-fiction",
        locale="en-US",
        concept="Write a book about artificial intelligence"
    )

@pytest.mark.asyncio
@patch("main.WriterAgent")
@patch("main.EditorAgent")
@patch("main.CritiqueAgent")
async def test_write_chapter(mock_critique_class, mock_editor_class, mock_writer_class):
    # Set up mock instances
    mock_writer = AsyncMock()
    mock_writer.write_chapter.return_value = "Drafted prose from writer"
    mock_writer_class.return_value = mock_writer

    mock_editor = AsyncMock()
    mock_editor.edit_chapter.return_value = "Polished prose from editor"
    mock_editor_class.return_value = mock_editor

    mock_critique = AsyncMock()
    mock_critique.audit_content.return_value = ("Final audited prose from critique", ["Fact-Checked"])
    mock_critique_class.return_value = mock_critique

    payload = {
        "projectId": "3f8b9d3b-0bb5-4f35-86ff-94b12d5df835",
        "chapterIndex": 1,
        "summary": "Deep dive into machine learning models",
        "discoveryAnswers": {"Q1": "A1"},
        "languageLocale": "en-US",
        "genre": "non-fiction"
    }

    response = client.post("/internal/swarm/write-chapter", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["chapter_index"] == 1
    assert data["prose"] == "Final audited prose from critique"
    assert data["status_flags"] == ["Fact-Checked"]
    
    mock_writer.write_chapter.assert_called_once_with(
        summary="Deep dive into machine learning models",
        discovery_answers={"Q1": "A1"},
        locale="en-US"
    )
    mock_editor.edit_chapter.assert_called_once_with("Drafted prose from writer")
    mock_critique.audit_content.assert_called_once_with("Polished prose from editor", "non-fiction")

def test_export_docx():
    payload = {
        "projectId": "3f8b9d3b-0bb5-4f35-86ff-94b12d5df835",
        "title": "My Swarm Book",
        "trimSize": "6x9",
        "paragraphs": [
            {"chapterIndex": 1, "paragraphIndex": 1, "formattedHtml": "<p>Hello World</p>"}
        ]
    }

    # We mock exporters to verify the response stream structure
    with patch("main.build_docx") as mock_build_docx:
        mock_doc = MagicMock()
        mock_build_docx.return_value = mock_doc

        response = client.post("/internal/export/docx", json=payload)
        
        assert response.status_code == 200
        assert "Content-Disposition" in response.headers
        assert "attachment; filename=exported_project_3f8b9d3b-0bb5-4f35-86ff-94b12d5df835.docx" in response.headers["Content-Disposition"]
        mock_build_docx.assert_called_once()

def test_export_pdf():
    payload = {
        "projectId": "3f8b9d3b-0bb5-4f35-86ff-94b12d5df835",
        "title": "My Swarm Book",
        "trimSize": "6x9",
        "paragraphs": [
            {"chapterIndex": 1, "paragraphIndex": 1, "formattedHtml": "<p>Hello World</p>"}
        ]
    }

    with patch("main.build_pdf") as mock_build_pdf:
        response = client.post("/internal/export/pdf", json=payload)
        
        assert response.status_code == 200
        assert "Content-Disposition" in response.headers
        assert "attachment; filename=exported_project_3f8b9d3b-0bb5-4f35-86ff-94b12d5df835.pdf" in response.headers["Content-Disposition"]
        mock_build_pdf.assert_called_once()
