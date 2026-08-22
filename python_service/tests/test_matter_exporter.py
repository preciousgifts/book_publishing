import io
import pytest
from pipeline.exporters.docx_exporter import build_docx
from pipeline.exporters.pdf_exporter import build_pdf

def test_build_docx_with_matter_pages():
    paragraphs_data = [
        {"chapterIndex": 0, "paragraphIndex": 0, "formattedHtml": "<p>Chapter 1 body content.</p>"}
    ]
    matter_pages = [
        {
            "id": "matter-1",
            "pageType": "title_page",
            "section": "FRONT",
            "order": 1,
            "included": True,
            "status": "APPROVED",
            "content": "<div style='text-align: center;'><h1>My Test Book</h1><p>By Author</p></div>",
            "authorInputs": {}
        },
        {
            "id": "matter-2",
            "pageType": "copyright_page",
            "section": "FRONT",
            "order": 2,
            "included": True,
            "status": "NOT_GENERATED",
            "content": "",
            "authorInputs": {}
        },
        {
            "id": "matter-3",
            "pageType": "about_author",
            "section": "BACK",
            "order": 14,
            "included": True,
            "status": "APPROVED",
            "content": "<p>About the Author content.</p>",
            "authorInputs": {}
        }
    ]

    doc = build_docx(paragraphs_data, "6x9", matter_pages=matter_pages, book_title="My Test Book")
    assert doc is not None
    # Verify document paragraphs exist
    assert len(doc.paragraphs) > 0

def test_build_pdf_with_matter_pages():
    paragraphs_data = [
        {"chapterIndex": 0, "paragraphIndex": 0, "formattedHtml": "<p>Chapter 1 body content.</p>"}
    ]
    matter_pages = [
        {
            "id": "matter-1",
            "pageType": "title_page",
            "section": "FRONT",
            "order": 1,
            "included": True,
            "status": "APPROVED",
            "content": "<h1>My Test Book</h1><p>By Author</p>",
            "authorInputs": {}
        },
        {
            "id": "matter-2",
            "pageType": "copyright_page",
            "section": "FRONT",
            "order": 2,
            "included": True,
            "status": "NOT_GENERATED",
            "content": "",
            "authorInputs": {}
        },
        {
            "id": "matter-3",
            "pageType": "about_author",
            "section": "BACK",
            "order": 14,
            "included": True,
            "status": "APPROVED",
            "content": "<p>About the Author content.</p>",
            "authorInputs": {}
        }
    ]

    buffer = io.BytesIO()
    build_pdf(buffer, paragraphs_data, "My Test Book", "6x9", matter_pages=matter_pages)
    buffer.seek(0)
    pdf_bytes = buffer.read()
    assert len(pdf_bytes) > 0
