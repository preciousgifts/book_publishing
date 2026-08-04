import re
import io
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from config import get_trim_spec

class KDPDocTemplate(BaseDocTemplate):
    def __init__(self, filename, book_title: str, spec: dict, **kw):
        """
        Custom doc template that automatically switches templates for odd/even pages.
        """
        self.pagesize = (spec["width"] * inch, spec["height"] * inch)
        super().__init__(filename, pagesize=self.pagesize, **kw)
        self.book_title = book_title
        self.spec = spec
        self.chapter_titles = {}  # Page -> chapter title mapping
        self.current_chapter_title = ""

    def handle_pageBegin(self):
        # Odd page = Right (1, 3, 5...), Even page = Left (2, 4, 6...)
        if self.page % 2 == 1:
            self._currentTemplateIndex = 0
        else:
            self._currentTemplateIndex = 1
        
        self.chapter_titles[self.page] = self.current_chapter_title
        super().handle_pageBegin()

def draw_odd_page(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 9)
    width, height = doc.pagesize
    outside = doc.spec["margins"]["outside"] * inch
    inside = doc.spec["margins"]["inside"] * inch
    top = doc.spec["margins"]["top"] * inch
    bottom = doc.spec["margins"]["bottom"] * inch
    
    # Header
    ch_title = doc.chapter_titles.get(doc.page, "")
    canvas_obj.drawRightString(width - outside, height - top + 15, ch_title)
    
    # Footer Page Number
    canvas_obj.drawRightString(width - outside, bottom - 20, str(doc.page))
    
    # Divider line
    canvas_obj.setStrokeColorRGB(0.7, 0.7, 0.7)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(inside, height - top + 5, width - outside, height - top + 5)
    canvas_obj.restoreState()

def draw_even_page(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 9)
    width, height = doc.pagesize
    outside = doc.spec["margins"]["outside"] * inch
    inside = doc.spec["margins"]["inside"] * inch
    top = doc.spec["margins"]["top"] * inch
    bottom = doc.spec["margins"]["bottom"] * inch
    
    # Header
    canvas_obj.drawString(outside, height - top + 15, doc.book_title)
    
    # Footer Page Number
    canvas_obj.drawString(outside, bottom - 20, str(doc.page))
    
    # Divider line
    canvas_obj.setStrokeColorRGB(0.7, 0.7, 0.7)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(outside, height - top + 5, width - inside, height - top + 5)
    canvas_obj.restoreState()

def clean_html_for_reportlab(html_text: str) -> str:
    """
    Translates HTML tags like <strong> and <em> to ReportLab supported tags.
    Strips raw header tags since formatting is handled via paragraph style.
    """
    text = html_text
    # Convert strong to bold b
    text = re.sub(r'</?strong>', lambda m: '<b>' if 'strong' in m.group(0) and '/' not in m.group(0) else '</b>', text)
    # Convert em to italic i
    text = re.sub(r'</?em>', lambda m: '<i>' if 'em' in m.group(0) and '/' not in m.group(0) else '</i>', text)
    # Strip layout elements
    text = re.sub(r'</?(h1|h2|h3|p)>', '', text)
    return text.strip()

def build_pdf(buffer, paragraphs_data: list, book_title: str, trim_size: str):
    """
    Generates a ReportLab PDF into the given buffer using alternating templates.
    """
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
    
    # Frame layout (Odd: inside is left margin; Even: outside is left margin)
    odd_frame = Frame(inside, bottom, frame_width, frame_height, id='odd_frame',
                      topPadding=0, bottomPadding=0, leftPadding=0, rightPadding=0)
    even_frame = Frame(outside, bottom, frame_width, frame_height, id='even_frame',
                       topPadding=0, bottomPadding=0, leftPadding=0, rightPadding=0)
    
    odd_template = PageTemplate(id='OddPage', frames=odd_frame, onPage=draw_odd_page)
    even_template = PageTemplate(id='EvenPage', frames=even_frame, onPage=draw_even_page)
    
    doc.addPageTemplates([odd_template, even_template])
    
    styles = getSampleStyleSheet()
    story = []
    
    # Custom print styles
    title_style = ParagraphStyle(
        'KDPTitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        spaceAfter=15,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'KDPBodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=8
    )
    
    current_chapter = None
    for p_data in paragraphs_data:
        ch_idx = p_data.get("chapterIndex", 0)
        
        if current_chapter is None or ch_idx != current_chapter:
            current_chapter = ch_idx
            doc.current_chapter_title = f"Chapter {current_chapter + 1}"
            story.append(Spacer(1, 20))
            story.append(Paragraph(doc.current_chapter_title, title_style))
            story.append(Spacer(1, 10))
            
        raw_html = p_data.get("formattedHtml", "")
        cleaned = clean_html_for_reportlab(raw_html)
        
        if "<h1>" in raw_html:
            style = title_style
        elif "<h2>" in raw_html:
            style = ParagraphStyle('KDPSub', parent=styles['Heading2'], fontSize=14, leading=18, spaceAfter=10, keepWithNext=True)
        elif "<h3>" in raw_html:
            style = ParagraphStyle('KDPSubSub', parent=styles['Heading3'], fontSize=12, leading=16, spaceAfter=8, keepWithNext=True)
        else:
            style = body_style
            
        story.append(Paragraph(cleaned, style))
        
    doc.build(story)
