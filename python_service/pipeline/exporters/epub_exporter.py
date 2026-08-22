import io
import zipfile
import re
from xml.sax.saxutils import escape

PAGE_TITLES = {
    'title_page': 'Title Page',
    'copyright_page': 'Copyright Page',
    'dedication': 'Dedication',
    'epigraph': 'Epigraph',
    'table_of_contents': 'Table of Contents',
    'foreword': 'Foreword',
    'preface': 'Preface',
    'acknowledgments': 'Acknowledgments',
    'introduction': 'Introduction',
    'appendix': 'Appendix',
    'glossary': 'Glossary',
    'bibliography': 'Endnotes & Bibliography',
    'index': 'Index',
    'about_author': 'About the Author',
    'also_by_author': 'Also By the Author',
    'discussion_questions': 'Discussion Questions',
    'call_to_action': 'Reader Review & Connect'
}

def clean_html(raw_html: str) -> str:
    """Ensures HTML is XML compliant for XHTML in EPUB."""
    if not raw_html:
        return ""
    # Ensure unclosed img tags become self-closing for XHTML compatibility
    clean = re.sub(r'<img([^>]*?)(?<!/)>', r'<img\1 />', raw_html)
    clean = clean.replace('&nbsp;', ' ')
    return clean

def build_epub(output_stream: io.BytesIO, paragraphs_data: list, book_title: str, matter_pages: list = None):
    """
    Constructs a reflowable EPUB 3.0 zip container.
    """
    matter_pages = matter_pages or []
    
    # Sort matter pages by section (FRONT -> BACK) and order
    front_matter = sorted([m for m in matter_pages if m.get('section') == 'FRONT'], key=lambda x: x.get('order', 0))
    back_matter = sorted([m for m in matter_pages if m.get('section') == 'BACK'], key=lambda x: x.get('order', 0))

    # Group paragraphs by chapterIndex
    chapters_map = {}
    for p in paragraphs_data:
        c_idx = p.get('chapterIndex', 0)
        if c_idx not in chapters_map:
            chapters_map[c_idx] = []
        chapters_map[c_idx].append(p.get('formattedHtml', ''))

    with zipfile.ZipFile(output_stream, 'w', zipfile.ZIP_DEFLATED) as zf:
        # 1. mimetype file (must be uncompressed as first entry)
        zf.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)

        # 2. META-INF/container.xml
        container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
        zf.writestr('META-INF/container.xml', container_xml)

        # CSS Stylesheet
        css_content = """
body {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
    margin: 5%;
    color: #1a1a1a;
}
h1 {
    font-size: 1.8em;
    text-align: center;
    margin-top: 2em;
    margin-bottom: 1em;
    text-transform: uppercase;
    letter-spacing: 1px;
}
h2 {
    font-size: 1.4em;
    text-align: center;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
}
p {
    text-indent: 1.5em;
    margin-top: 0;
    margin-bottom: 0;
    text-align: justify;
}
p.first-para {
    text-indent: 0;
}
.title-page {
    text-align: center;
    margin-top: 30%;
}
.title-page h1 {
    font-size: 2.4em;
}
figure {
    text-align: center;
    margin: 1.5em 0;
}
img {
    max-width: 100%;
    height: auto;
}
figcaption {
    font-size: 0.85em;
    color: #666;
    font-style: italic;
    margin-top: 0.5em;
}
"""
        zf.writestr('OEBPS/style.css', css_content)

        manifest_items = [
            '<item id="css" href="style.css" media-type="text/css"/>',
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
        ]
        spine_items = []
        nav_toc_links = []

        item_id_counter = 1

        # Render Front Matter XHTML files
        for fm in front_matter:
            item_id = f"fm_{item_id_counter}"
            item_id_counter += 1
            filename = f"{item_id}.xhtml"
            p_title = PAGE_TITLES.get(fm.get('pageType'), fm.get('pageType', 'Front Matter'))
            content_body = clean_html(fm.get('content', ''))

            xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>{escape(p_title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>{escape(p_title)}</h1>
  <div class="matter-content">
    {content_body}
  </div>
</body>
</html>"""
            zf.writestr(f"OEBPS/{filename}", xhtml)
            manifest_items.append(f'<item id="{item_id}" href="{filename}" media-type="application/xhtml+xml"/>')
            spine_items.append(f'<itemref idref="{item_id}"/>')
            nav_toc_links.append(f'<li><a href="{filename}">{escape(p_title)}</a></li>')

        # Render Chapters XHTML files
        sorted_chapter_keys = sorted(chapters_map.keys())
        for c_idx in sorted_chapter_keys:
            item_id = f"chap_{c_idx + 1}"
            filename = f"{item_id}.xhtml"
            c_title = f"Chapter {c_idx + 1}"
            paras = chapters_map[c_idx]

            body_html_parts = []
            for p_idx, p_html in enumerate(paras):
                cleaned = clean_html(p_html)
                if p_idx == 0 and not cleaned.startswith('<figure'):
                    body_html_parts.append(f'<p class="first-para">{cleaned}</p>')
                elif cleaned.startswith('<figure') or cleaned.startswith('<p'):
                    body_html_parts.append(cleaned)
                else:
                    body_html_parts.append(f'<p>{cleaned}</p>')

            chapter_body = "\n".join(body_html_parts)

            xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>{escape(c_title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>{escape(c_title)}</h1>
  {chapter_body}
</body>
</html>"""
            zf.writestr(f"OEBPS/{filename}", xhtml)
            manifest_items.append(f'<item id="{item_id}" href="{filename}" media-type="application/xhtml+xml"/>')
            spine_items.append(f'<itemref idref="{item_id}"/>')
            nav_toc_links.append(f'<li><a href="{filename}">{escape(c_title)}</a></li>')

        # Render Back Matter XHTML files
        for bm in back_matter:
            item_id = f"bm_{item_id_counter}"
            item_id_counter += 1
            filename = f"{item_id}.xhtml"
            p_title = PAGE_TITLES.get(bm.get('pageType'), bm.get('pageType', 'Back Matter'))
            content_body = clean_html(bm.get('content', ''))

            xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>{escape(p_title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>{escape(p_title)}</h1>
  <div class="matter-content">
    {content_body}
  </div>
</body>
</html>"""
            zf.writestr(f"OEBPS/{filename}", xhtml)
            manifest_items.append(f'<item id="{item_id}" href="{filename}" media-type="application/xhtml+xml"/>')
            spine_items.append(f'<itemref idref="{item_id}"/>')
            nav_toc_links.append(f'<li><a href="{filename}">{escape(p_title)}</a></li>')

        # Render nav.xhtml
        nav_xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      {"".join(nav_toc_links)}
    </ol>
  </nav>
</body>
</html>"""
        zf.writestr('OEBPS/nav.xhtml', nav_xhtml)

        # Render OEBPS/content.opf
        manifest_str = "\n    ".join(manifest_items)
        spine_str = "\n    ".join(spine_items)

        content_opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{escape(book_title or 'Untitled Book')}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">urn:uuid:publishflow-{hash(book_title or 'book') & 0xffffffff}</dc:identifier>
    <meta property="dcterms:modified">2026-08-07T00:00:00Z</meta>
  </metadata>
  <manifest>
    {manifest_str}
  </manifest>
  <spine>
    {spine_str}
  </spine>
</package>"""
        zf.writestr('OEBPS/content.opf', content_opf)
