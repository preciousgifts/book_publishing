import io
import zipfile
import pytest
from pipeline.exporters.epub_exporter import build_epub

def test_build_epub_structure():
    paragraphs_data = [
        {"chapterIndex": 0, "paragraphIndex": 0, "formattedHtml": "<p>First paragraph of Chapter 1.</p>"},
        {"chapterIndex": 0, "paragraphIndex": 1, "formattedHtml": "<p>Second paragraph of Chapter 1.</p>"},
        {"chapterIndex": 1, "paragraphIndex": 0, "formattedHtml": "<p>First paragraph of Chapter 2.</p>"}
    ]
    matter_pages = [
        {
            "id": "matter-1",
            "pageType": "title_page",
            "section": "FRONT",
            "order": 1,
            "included": True,
            "status": "APPROVED",
            "content": "<h1>My EPUB Book Title</h1>",
            "authorInputs": {}
        },
        {
            "id": "matter-2",
            "pageType": "about_author",
            "section": "BACK",
            "order": 10,
            "included": True,
            "status": "APPROVED",
            "content": "<p>About the Author prose.</p>",
            "authorInputs": {}
        }
    ]

    output_stream = io.BytesIO()
    build_epub(output_stream, paragraphs_data, book_title="My EPUB Book Title", matter_pages=matter_pages)
    output_stream.seek(0)

    # Verify output stream is a valid zip containing required EPUB files
    with zipfile.ZipFile(output_stream, 'r') as zf:
        namelist = zf.namelist()
        assert "mimetype" in namelist
        assert "META-INF/container.xml" in namelist
        assert "OEBPS/content.opf" in namelist
        assert "OEBPS/nav.xhtml" in namelist
        assert "OEBPS/style.css" in namelist
        assert "OEBPS/fm_1.xhtml" in namelist
        assert "OEBPS/chap_1.xhtml" in namelist
        assert "OEBPS/chap_2.xhtml" in namelist
        assert "OEBPS/bm_2.xhtml" in namelist

        # Check mimetype file content
        assert zf.read("mimetype").decode('utf-8') == "application/epub+zip"
