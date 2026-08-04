import re
import io
import json
import docx
from pipeline.agents.base import BaseAgent

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
            # Fallback JSON structure on error
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

async def parse_manuscript_file(file_bytes: bytes, filename: str, title: str, genre: str, locale: str) -> dict:
    paragraphs_text = []

    # 1. Parse content based on file type
    if filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(file_bytes))
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                paragraphs_text.append(text)
    else:
        # Default as txt / md
        text_content = file_bytes.decode("utf-8", errors="ignore")
        # Split by lines
        for line in text_content.splitlines():
            line = line.strip()
            if line:
                paragraphs_text.append(line)

    if not paragraphs_text:
        raise ValueError("The uploaded manuscript file is empty or could not be parsed.")

    # 2. Segment into chapters and paragraphs using structural regular expression
    chapter_regex = re.compile(
        r'^(?:##?\s+)?(?:Chapter|CHAPTER|Ch\.|ch\.)\s+([0-9]+|[IVXLCDM]+|[A-Za-z\s]+)(?:\:?\s+(.*))?$',
        re.IGNORECASE
    )

    chapters = []
    current_chapter = {
        "title": "Introduction",
        "chapterIndex": 1,
        "paragraphs": []
    }

    for p_text in paragraphs_text:
        match = chapter_regex.match(p_text)
        if match:
            # Save preceding chapter if it contains paragraphs
            if current_chapter["paragraphs"]:
                chapters.append(current_chapter)
            
            chap_num = match.group(1).strip()
            chap_title = match.group(2).strip() if match.group(2) else ""
            heading = f"Chapter {chap_num}"
            if chap_title:
                heading += f": {chap_title}"

            current_chapter = {
                "title": heading,
                "chapterIndex": len(chapters) + 1,
                "paragraphs": []
            }
        else:
            current_chapter["paragraphs"].append(p_text)

    # Add the last chapter
    if current_chapter["paragraphs"] or current_chapter["title"] != "Introduction":
        chapters.append(current_chapter)

    if not chapters:
        chapters = [{
            "title": "Introduction",
            "chapterIndex": 1,
            "paragraphs": paragraphs_text
        }]

    # 3. Create context previews for Auditor Agent
    chapters_summary_lines = []
    flat_paragraphs = []

    for c in chapters:
        word_count = sum(len(p.split()) for p in c["paragraphs"])
        preview_paras = c["paragraphs"][:3]
        preview_text = "\n".join(f"- {p}" for p in preview_paras)
        
        chapters_summary_lines.append(f"""
Chapter {c['chapterIndex']}: {c['title']}
Word Count: {word_count}
Content Preview:
{preview_text}
""")
        # Accumulate flat paragraphs list for database mapping
        for idx, p_val in enumerate(c["paragraphs"]):
            flat_paragraphs.append({
                "chapterIndex": c["chapterIndex"],
                "paragraphIndex": idx,
                "rawContent": p_val,
                "formattedHtml": f"<p>{p_val}</p>",
                "statusFlags": []
            })

    chapters_summary_str = "\n".join(chapters_summary_lines)

    # 4. Invoke Auditor Agent
    auditor = AuditorAgent()
    audit_result = await auditor.audit_manuscript(title, genre, locale, chapters_summary_str)

    return {
        "healthReport": audit_result.get("healthReport", "No report generated."),
        "toc": audit_result.get("toc", []),
        "paragraphs": flat_paragraphs
    }
