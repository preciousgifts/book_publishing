import re
import io
import base64
from html.parser import HTMLParser
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Image as RLImage
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER, TA_RIGHT
from config import get_trim_spec

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

def to_roman(n: int) -> str:
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syb = ["m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"]
    roman_num = ''
    i = 0
    while n > 0:
        for _ in range(n // val[i]):
            roman_num += syb[i]
            n -= val[i]
        i += 1
    return roman_num

class KDPDocTemplate(BaseDocTemplate):
    def __init__(self, filename, book_title: str, spec: dict, **kw):
        self.pagesize = (spec["width"] * inch, spec["height"] * inch)
        super().__init__(filename, pagesize=self.pagesize, **kw)
        self.book_title = book_title
        self.spec = spec
        self.chapter_titles = {}
        self.page_number_types = {}
        self.current_section = 'FRONT'
        self.roman_counter = 0
        self.arabic_counter = 0

    def handle_pageBegin(self):
        super().handle_pageBegin()


def draw_page_number_and_header(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 9)
    width, height = doc.pagesize
    outside = doc.spec["margins"]["outside"] * inch
    inside = doc.spec["margins"]["inside"] * inch
    top = doc.spec["margins"]["top"] * inch
    bottom = doc.spec["margins"]["bottom"] * inch

    page_info = getattr(doc, 'current_page_number_info', ('arabic', str(doc.page)))
    num_style, num_str = page_info

    if num_style != 'none':
        if doc.page % 2 == 1:
            ch_title = doc.chapter_titles.get(doc.page, "")
            canvas_obj.drawRightString(width - outside, height - top + 15, ch_title or doc.book_title)
            canvas_obj.drawRightString(width - outside, bottom - 20, num_str)
            canvas_obj.setStrokeColorRGB(0.7, 0.7, 0.7)
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(inside, height - top + 5, width - outside, height - top + 5)
        else:
            canvas_obj.drawString(outside, height - top + 15, doc.book_title)
            canvas_obj.drawString(outside, bottom - 20, num_str)
            canvas_obj.setStrokeColorRGB(0.7, 0.7, 0.7)
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(outside, height - top + 5, width - inside, height - top + 5)

    canvas_obj.restoreState()


def sanitize_html_fragment(html_text: str) -> str:
    """
    Sanitizes HTML input so it only contains ReportLab supported inline tags:
    <b>, <i>, <u>, <font>, <sub>, <sup>, <strike>, <br/>, <a>.
    Strips out unsupported tags like <div>, <span>, <p>, style attributes, class attributes,
    and escapes ampersands.
    """
    if not html_text:
        return ""

    text = html_text
    # 1. Normalize line breaks to valid self-closing XML <br/>
    text = re.sub(r'<br\s*/?>', '<br/>', text, flags=re.IGNORECASE)

    # 2. Clean markdown headers / bold / italic if raw markdown passed
    text = re.sub(r'^#{1,6}\s+', '', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    text = re.sub(r'_(.*?)_', r'<i>\1</i>', text)

    # 3. Normalize <strong> -> <b>, <em> -> <i>
    text = re.sub(r'</?strong[^>]*>', lambda m: '<b>' if '/' not in m.group(0) else '</b>', text, flags=re.IGNORECASE)
    text = re.sub(r'</?em[^>]*>', lambda m: '<i>' if '/' not in m.group(0) else '</i>', text, flags=re.IGNORECASE)

    # 4. Strip block tags and span tags with attributes
    text = re.sub(r'</?(p|div|section|article|header|footer|figure|figcaption|dl|dt|dd|ul|ol|li|h[1-6]|blockquote|table|tr|td|body|html)[^>]*>', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'</?span[^>]*>', '', text, flags=re.IGNORECASE)

    # 5. Remove attributes from <b>, <i>, <u>, <sub/>, <sup/>, etc., unless it's <a href="...">
    text = re.sub(r'<(b|i|u|sub|sup|strike)\s+[^>]*>', r'<\1>', text, flags=re.IGNORECASE)

    # 6. Escape raw ampersands that are NOT part of valid XML entities
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)', '&amp;', text)

    # 7. Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_html_to_story_blocks(html_text: str, default_style: ParagraphStyle, h1_style: ParagraphStyle, h2_style: ParagraphStyle, h3_style: ParagraphStyle, blockquote_style: ParagraphStyle) -> list:
    """
    Parses complex HTML text into a list of ReportLab Flowables (Paragraphs / Spacers).
    """
    if not html_text or not html_text.strip():
        return []

    blocks = []
    # Split raw HTML into blocks by block level tags (p, div, h1, h2, h3, blockquote, li, dt, dd)
    raw_blocks = re.split(r'(</?(?:p|div|h1|h2|h3|blockquote|li|dt|dd|figure|section)[^>]*>)', html_text, flags=re.IGNORECASE)

    current_tag = None

    for item in raw_blocks:
        if not item:
            continue

        item_lower = item.lower().strip()

        # Check if item is a block opening tag
        if item_lower.startswith('<h1'):
            current_tag = 'h1'
            continue
        elif item_lower.startswith('<h2'):
            current_tag = 'h2'
            continue
        elif item_lower.startswith('<h3'):
            current_tag = 'h3'
            continue
        elif item_lower.startswith('<blockquote'):
            current_tag = 'blockquote'
            continue
        elif item_lower.startswith('<p') or item_lower.startswith('<div') or item_lower.startswith('<li') or item_lower.startswith('<dt') or item_lower.startswith('<dd'):
            current_tag = 'p'
            continue

        # Check if closing tag
        if item_lower.startswith('</'):
            current_tag = None
            continue

        # Content fragment
        cleaned = sanitize_html_fragment(item)
        cleaned_no_br = re.sub(r'<br\s*/?>', '', cleaned).strip()
        if not cleaned or not cleaned_no_br:
            if '<br' in item_lower:
                blocks.append(Spacer(1, 8))
            continue

        # Choose style
        if current_tag == 'h1':
            blocks.append(Paragraph(cleaned, h1_style))
            blocks.append(Spacer(1, 6))
        elif current_tag == 'h2':
            blocks.append(Paragraph(cleaned, h2_style))
            blocks.append(Spacer(1, 4))
        elif current_tag == 'h3':
            blocks.append(Paragraph(cleaned, h3_style))
            blocks.append(Spacer(1, 4))
        elif current_tag == 'blockquote':
            blocks.append(Paragraph(cleaned, blockquote_style))
            blocks.append(Spacer(1, 4))
        else:
            # Check alignment style in raw item if present
            style_to_use = default_style
            if "text-align: center" in item_lower:
                style_to_use = ParagraphStyle('CenterStyle', parent=default_style, alignment=TA_CENTER)
            elif "text-align: right" in item_lower:
                style_to_use = ParagraphStyle('RightStyle', parent=default_style, alignment=TA_RIGHT)
            elif "text-align: left" in item_lower:
                style_to_use = ParagraphStyle('LeftStyle', parent=default_style, alignment=TA_LEFT)

            blocks.append(Paragraph(cleaned, style_to_use))
            blocks.append(Spacer(1, 4))

    return blocks


def build_pdf(buffer, paragraphs_data: list, book_title: str, trim_size: str, matter_pages: list = None):
    spec = get_trim_spec(trim_size)
    doc = KDPDocTemplate(buffer, book_title, spec)
    
    width = spec["width"] * inch
    height = spec["height"] * inch
    inside = spec["margins"]["inside"] * inch
    outside = spec["margins"]["outside"] * inch
    top = spec["margins"]["top"] * inch
    bottom = spec["margins"]["bottom"] * inch
    
    frame_width = width - inside - outside
    frame_height = height - top - bottom
    
    odd_frame = Frame(inside, bottom, frame_width, frame_height, id='odd_frame',
                      topPadding=0, bottomPadding=0, leftPadding=0, rightPadding=0)
    even_frame = Frame(outside, bottom, frame_width, frame_height, id='even_frame',
                       topPadding=0, bottomPadding=0, leftPadding=0, rightPadding=0)
    
    odd_template = PageTemplate(id='OddPage', frames=odd_frame, onPage=draw_page_number_and_header)
    even_template = PageTemplate(id='EvenPage', frames=even_frame, onPage=draw_page_number_and_header)
    
    doc.addPageTemplates([odd_template, even_template])
    
    styles = getSampleStyleSheet()
    story = []
    
    title_style = ParagraphStyle(
        'KDPTitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceAfter=15,
        alignment=TA_LEFT,
        keepWithNext=True
    )

    center_title_style = ParagraphStyle(
        'KDPCenterTitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        spaceAfter=20,
        alignment=TA_CENTER
    )

    h2_style = ParagraphStyle(
        'KDPH2Style',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        spaceAfter=10,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'KDPH3Style',
        parent=styles['Heading3'],
        fontSize=12,
        leading=16,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'KDPBodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    copyright_style = ParagraphStyle(
        'KDPCopyrightStyle',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11.5,
        alignment=TA_LEFT,
        spaceAfter=6
    )

    dedication_style = ParagraphStyle(
        'KDPDedicationStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique',
        spaceAfter=12
    )

    blockquote_style = ParagraphStyle(
        'KDPBlockquoteStyle',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13.5,
        alignment=TA_LEFT,
        leftIndent=20,
        rightIndent=20,
        fontName='Helvetica-Oblique',
        spaceAfter=8
    )

    placeholder_style = ParagraphStyle(
        'KDPPlaceholderStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique',
        textColor='#666666'
    )

    matter_pages = matter_pages or []
    front_matter = [m for m in matter_pages if m.get("section") == "FRONT"]
    back_matter = [m for m in matter_pages if m.get("section") == "BACK"]

    front_matter.sort(key=lambda x: x.get("order", 0))
    back_matter.sort(key=lambda x: x.get("order", 0))

    # Helper function to process matter page into story
    def append_matter_page(page: dict):
        p_type = page.get("pageType", "")
        content = page.get("content", "")
        status = page.get("status", "NOT_GENERATED")
        t_label = PAGE_TITLES.get(p_type, p_type.replace('_', ' ').title())

        if p_type != 'title_page':
            story.append(Spacer(1, 15))
            if p_type in ('copyright_page', 'dedication', 'epigraph'):
                story.append(Paragraph(t_label, center_title_style if p_type != 'copyright_page' else title_style))
            else:
                story.append(Paragraph(t_label, title_style))
            story.append(Spacer(1, 10))

        if not content or content.strip() == "" or status == "NOT_GENERATED":
            story.append(Paragraph(f"[{t_label} - Content not yet generated for this page]", placeholder_style))
            story.append(Spacer(1, 15))
            return

        # Choose base style
        if p_type == 'copyright_page':
            base_style = copyright_style
        elif p_type in ('dedication', 'epigraph'):
            base_style = dedication_style
        elif p_type == 'title_page':
            base_style = ParagraphStyle('TitlePageBody', parent=body_style, alignment=TA_CENTER)
        else:
            base_style = body_style

        blocks = parse_html_to_story_blocks(content, base_style, title_style, h2_style, h3_style, blockquote_style)
        story.extend(blocks)
        story.append(Spacer(1, 15))

    # 1. Add Front Matter Pages
    for idx, page in enumerate(front_matter):
        if idx > 0:
            story.append(PageBreak())
        append_matter_page(page)

    # 2. Add Chapters
    if paragraphs_data:
        if front_matter:
            story.append(PageBreak())

        current_chapter = None
        for p_data in paragraphs_data:
            ch_idx = p_data.get("chapterIndex", 0)
            
            if current_chapter is None or ch_idx != current_chapter:
                if current_chapter is not None:
                    story.append(PageBreak())
                current_chapter = ch_idx
                doc.current_chapter_title = f"Chapter {current_chapter + 1}"
                story.append(Spacer(1, 20))
                story.append(Paragraph(doc.current_chapter_title, title_style))
                story.append(Spacer(1, 10))
                
            raw_html = p_data.get("formattedHtml", "")

            # Handle inline image / figure insertion
            if "data:image/" in raw_html and ";base64," in raw_html:
                try:
                    img_match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', raw_html)
                    if img_match:
                        base64_str = img_match.group(1)
                        img_bytes = base64.b64decode(base64_str)
                        img_io = io.BytesIO(img_bytes)
                        
                        target_w = min(frame_width * 0.8, 4.0 * inch)
                        rl_img = RLImage(img_io, width=target_w, height=target_w * 0.6)
                        story.append(Spacer(1, 8))
                        story.append(rl_img)
                        story.append(Spacer(1, 8))
                except Exception:
                    pass
                continue

            blocks = parse_html_to_story_blocks(raw_html, body_style, title_style, h2_style, h3_style, blockquote_style)
            story.extend(blocks)

    # 3. Add Back Matter Pages
    for page in back_matter:
        story.append(PageBreak())
        append_matter_page(page)

    doc.build(story)
