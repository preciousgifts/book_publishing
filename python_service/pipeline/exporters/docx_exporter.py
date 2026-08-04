from docx import Document
from docx.shared import Inches
from docx.oxml import parse_xml
from html.parser import HTMLParser
from config import get_trim_spec

class ParagraphBuilder(HTMLParser):
    def __init__(self, doc: Document, initial_paragraph):
        super().__init__()
        self.doc = doc
        self.current_paragraph = initial_paragraph
        self.active_styles = set()
        self.has_content = False

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "p":
            if self.has_content or len(self.current_paragraph.runs) > 0 or self.current_paragraph.text:
                self.current_paragraph = self.doc.add_paragraph()
        elif tag == "h1":
            self.current_paragraph = self.doc.add_paragraph()
            try:
                self.current_paragraph.style = "Heading 1"
            except Exception:
                pass
        elif tag == "h2":
            self.current_paragraph = self.doc.add_paragraph()
            try:
                self.current_paragraph.style = "Heading 2"
            except Exception:
                pass
        elif tag == "h3":
            self.current_paragraph = self.doc.add_paragraph()
            try:
                self.current_paragraph.style = "Heading 3"
            except Exception:
                pass
        elif tag in ("strong", "b"):
            self.active_styles.add("bold")
        elif tag in ("em", "i"):
            self.active_styles.add("italic")
        elif tag == "br":
            self.current_paragraph.add_run().add_break()
            self.has_content = True

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("strong", "b"):
            self.active_styles.discard("bold")
        elif tag in ("em", "i"):
            self.active_styles.discard("italic")

    def handle_data(self, data):
        if not data:
            return
        run = self.current_paragraph.add_run(data)
        self.has_content = True
        if "bold" in self.active_styles:
            run.bold = True
        if "italic" in self.active_styles:
            run.italic = True

def build_docx(paragraphs_data: list, trim_size: str) -> Document:
    """
    Builds a word document based on the paragraphs data and trim size configuration.
    Sets mirror margins for print layout.
    """
    doc = Document()
    spec = get_trim_spec(trim_size)
    section = doc.sections[0]
    
    # Page setup
    section.page_width = Inches(spec["width"])
    section.page_height = Inches(spec["height"])
    
    # Margin settings
    section.top_margin = Inches(spec["margins"]["top"])
    section.bottom_margin = Inches(spec["margins"]["bottom"])
    section.left_margin = Inches(spec["margins"]["inside"])   # inside
    section.right_margin = Inches(spec["margins"]["outside"])  # outside
    
    # Word XML Mirror Margins Injection
    section.different_first_page_header_footer = True
    sectPr = section._sectPr
    type_elm = parse_xml(r'<w:mirrorMargins xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>')
    sectPr.append(type_elm)
    
    if not paragraphs_data:
        doc.add_paragraph("")
    else:
        # Group paragraphs by chapter to insert chapter markers
        current_chapter = None
        active_p = doc.paragraphs[0]
        
        for p_data in paragraphs_data:
            ch_idx = p_data.get("chapterIndex", 0)
            if current_chapter is None or ch_idx != current_chapter:
                current_chapter = ch_idx
                # Heading for chapter
                ch_p = doc.add_paragraph()
                ch_p.style = "Heading 1"
                ch_p.add_run(f"Chapter {current_chapter + 1}")
                active_p = doc.add_paragraph()
                
            builder = ParagraphBuilder(doc, active_p)
            builder.feed(p_data.get("formattedHtml", ""))
            active_p = doc.add_paragraph()

    # Cleanup trailing/empty paragraphs
    for p in list(doc.paragraphs):
        if len(p.runs) == 0 and not p.text:
            p_element = p._p
            p_element.getparent().remove(p_element)
            
    return doc
