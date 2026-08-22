import re
import io
import json
import logging
import docx
from pipeline.agents.base import BaseAgent

logger = logging.getLogger(__name__)

AUDITOR_SYSTEM_INSTRUCTION = """You are the Senior Auditor & Gap-Analysis Agent for PublishFlow AI.
Your task is to analyze the provided manuscript outline and content previews to produce a comprehensive health audit report and a refined Table of Contents (ToC).

You MUST respond ONLY with a valid JSON object matching the following structure:
{
  "healthReport": "A detailed markdown report evaluating chapter balance, pacing, structural gaps, readability, and actionable suggestions.",
  "toc": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "summary": "Brief summary/focus of this chapter based on the parsed content.",
      "subtopics": ["Subtopic A", "Subtopic B"]
    }
  ]
}

Ensure the healthReport is highly detailed and uses standard markdown headers, bullet points, and clean formatting.
Do not output any introductory or concluding text, backticks, or other formatting. Return ONLY valid, parseable JSON.
"""

class AuditorAgent(BaseAgent):
    def __init__(self, model: str = "gemini-2.5-flash"):
        super().__init__(system_instruction=AUDITOR_SYSTEM_INSTRUCTION, model=model)

    async def audit_manuscript(self, title: str, genre: str, locale: str, chapters_summary: str) -> dict:
        prompt = f"""Book Title: {title}
Genre: {genre}
Locale: {locale}

Here is the structure and previews of the uploaded manuscript:
========================================
{chapters_summary}
========================================

Please perform the audit and provide the health report along with the refined ToC outline in JSON format:"""
        
        response_text = await self.generate(prompt, response_mime_type="application/json")
        try:
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            return json.loads(clean_text)
        except Exception as e:
            return {
                "healthReport": f"### Manuscript Audit Error\nFailed to generate report: {str(e)}\nRaw Response: {response_text}",
                "toc": [
                    {
                        "chapterNumber": 1,
                        "title": "Introduction",
                        "summary": "First chapter of the book.",
                        "subtopics": []
                    }
                ]
            }

def _docx_paragraph_to_html(p) -> str:
    """Converts a python-docx paragraph to rich formatted HTML preserving bold, italic, underline, and alignment."""
    html_runs = []
    for r in p.runs:
        text = r.text
        if not text:
            continue
        escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if r.bold:
            escaped = f"<strong>{escaped}</strong>"
        if r.italic:
            escaped = f"<em>{escaped}</em>"
        if r.underline:
            escaped = f"<u>{escaped}</u>"
        html_runs.append(escaped)

    inner = "".join(html_runs) if html_runs else p.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    align_attr = ""
    if p.alignment:
        align_name = str(p.alignment).split(".")[-1].lower()
        if align_name in ["center", "right", "justify"]:
            align_attr = f' style="text-align: {align_name};"'
            
    return f"<p{align_attr}>{inner}</p>"

def _is_short_title_candidate(line: str) -> bool:
    """Heuristic for unstyled heading detection: short, title case or numbered, no trailing sentence punctuation."""
    clean = line.strip()
    if not clean or len(clean) > 80:
        return False
    # Numbered heading pattern: "1. Overview of the Strategy", "1 Overview", "I. Overview", "Chapter 1"
    if re.match(r'^(?:[0-9]+|[IVXLCDM]+)[\.\:]?\s+[A-Z]', clean):
        return True
    if clean.endswith(".") or clean.endswith(",") or clean.endswith(";") or clean.endswith(":"):
        return False
    if clean.istitle() or clean.isupper():
        return True
    return False

async def parse_manuscript_file(file_bytes: bytes, filename: str, title: str, genre: str, locale: str) -> dict:
    parsed_paragraphs = []
    
    # Layered parsing: extract paragraph records (title, rawContent, formattedHtml, is_heading)
    if filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(file_bytes))
        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            
            style_name = (p.style.name if p.style else "").lower()
            is_docx_heading = style_name.startswith("heading") or style_name.startswith("title")
            formatted_html = _docx_paragraph_to_html(p)
            
            parsed_paragraphs.append({
                "rawContent": text,
                "formattedHtml": formatted_html,
                "is_docx_heading": is_docx_heading,
                "docx_style": p.style.name if p.style else ""
            })
    else:
        # Default .txt / .md
        text_content = file_bytes.decode("utf-8", errors="ignore")
        for line in text_content.splitlines():
            line_str = line.strip()
            if not line_str:
                continue
            escaped = line_str.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            parsed_paragraphs.append({
                "rawContent": line_str,
                "formattedHtml": f"<p>{escaped}</p>",
                "is_docx_heading": False,
                "docx_style": ""
            })

    if not parsed_paragraphs:
        raise ValueError("The uploaded manuscript file is empty or could not be parsed.")

    # Regex patterns
    markdown_regex = re.compile(r'^(?:#|##|###)\s+(.+)$')
    chapter_regex = re.compile(
        r'^(?:##?\s+)?(?:Chapter|CHAPTER|Ch\.|ch\.)\s+([0-9]+|[IVXLCDM]+|[A-Za-z\s]+)(?:\:?\s+(.*))?$',
        re.IGNORECASE
    )

    chapters = []
    current_chapter = {
        "title": "Introduction",
        "chapterIndex": 0, # 0-based indexing to match client
        "paragraphs": []
    }
    
    confident_heading_found = False

    for item in parsed_paragraphs:
        p_text = item["rawContent"]
        heading_title = None
        
        # Layer (a): Native DOCX heading style
        if item["is_docx_heading"]:
            heading_title = p_text
            confident_heading_found = True
        else:
            # Layer (b): Markdown heading syntax (#, ##)
            md_match = markdown_regex.match(p_text)
            if md_match:
                heading_title = md_match.group(1).strip()
                confident_heading_found = True
            else:
                # Layer (c): Chapter/Ch. regex
                ch_match = chapter_regex.match(p_text)
                if ch_match:
                    chap_num = ch_match.group(1).strip()
                    chap_sub = ch_match.group(2).strip() if ch_match.group(2) else ""
                    heading_title = f"Chapter {chap_num}" + (f": {chap_sub}" if chap_sub else "")
                    confident_heading_found = True
                elif _is_short_title_candidate(p_text):
                    # Layer (d): Short title-case / numbered heuristic
                    heading_title = p_text
                    confident_heading_found = True

        if heading_title:
            if current_chapter["paragraphs"]:
                chapters.append(current_chapter)
                current_chapter = {
                    "title": heading_title,
                    "chapterIndex": len(chapters), # 0-based index
                    "paragraphs": []
                }
            else:
                current_chapter["title"] = heading_title
        else:
            current_chapter["paragraphs"].append(item)

    if current_chapter["paragraphs"] or current_chapter["title"] != "Introduction":
        chapters.append(current_chapter)

    if not chapters:
        chapters = [{
            "title": "Introduction",
            "chapterIndex": 0,
            "paragraphs": parsed_paragraphs
        }]

    # Log/flag if single chapter fallback was used
    notice = None
    if not confident_heading_found and len(chapters) == 1:
        notice = "we couldn't detect chapter breaks — showing as one chapter"
        logger.warning(f"[MANUSCRIPT_PARSER] {notice}")

    # Build context previews for Auditor Agent and flat 0-based paragraphs list
    chapters_summary_lines = []
    flat_paragraphs = []

    for c in chapters:
        word_count = sum(len(p["rawContent"].split()) for p in c["paragraphs"])
        preview_paras = [p["rawContent"] for p in c["paragraphs"][:3]]
        preview_text = "\n".join(f"- {p}" for p in preview_paras)
        
        chapters_summary_lines.append(f"""
Chapter {c['chapterIndex'] + 1}: {c['title']}
Word Count: {word_count}
Content Preview:
{preview_text}
""")
        # Accumulate flat paragraphs list with 0-based chapterIndex
        for idx, p_item in enumerate(c["paragraphs"]):
            flat_paragraphs.append({
                "chapterIndex": c["chapterIndex"],
                "paragraphIndex": idx,
                "rawContent": p_item["rawContent"],
                "formattedHtml": p_item["formattedHtml"],
                "statusFlags": []
            })

    chapters_summary_str = "\n".join(chapters_summary_lines)

    # Invoke Auditor Agent
    auditor = AuditorAgent()
    audit_result = await auditor.audit_manuscript(title, genre, locale, chapters_summary_str)

    return {
        "healthReport": audit_result.get("healthReport", "No report generated."),
        "toc": audit_result.get("toc", []),
        "paragraphs": flat_paragraphs,
        "detectionNotice": notice
    }
