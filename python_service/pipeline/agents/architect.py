import json
from pipeline.agents.base import BaseAgent

SYSTEM_INSTRUCTION = """You are the Lead Architect Agent for PublishFlow AI.
Your task is to design the outline of a book based on the provided title, genre, language locale, and concept prompt.

You MUST respond ONLY with a valid JSON object matching the following structure:
{
  "toc": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "summary": "Brief summary of what happens in this chapter.",
      "subtopics": ["Subtopic A", "Subtopic B"]
    }
  ],
  "discoveryQuestions": [
    "Question to refine book style/tone 1",
    "Question to refine book style/tone 2",
    "Question to refine book style/tone 3"
  ]
}

Ensure the discovery questions are highly relevant (3 to 5 questions).
Do not output any introductory or concluding text, backticks, or other formatting. Return ONLY valid, parseable JSON.
"""

class ArchitectAgent(BaseAgent):
    def __init__(self, model: str = "pro"):
        super().__init__(system_instruction=SYSTEM_INSTRUCTION, model=model)

    async def design_book(self, title: str, genre: str, locale: str, concept: str) -> dict:
        prompt = f"""Title: {title}
Genre: {genre}
Locale: {locale}
Concept/Prompt: {concept}

Generate the ToC outline and refinement questions now:"""
        
        response_text = await self.generate(prompt, response_mime_type="application/json")
        try:
            # Clean up the output if the model wrapped it in markdown code blocks
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            return json.loads(clean_text)
        except Exception as e:
            return {
                "toc": [
                    {
                        "chapterNumber": 1,
                        "title": "Introduction",
                        "summary": f"Introduction to {title}",
                        "subtopics": []
                    }
                ],
                "discoveryQuestions": [
                    "What target audience do you have in mind?",
                    "Should the style be formal or informal?"
                ],
                "error": f"Failed to parse LLM JSON: {str(e)}"
            }

    async def adjust_outline(self, action: str, current_toc: list, target_count: int = None, feedback: str = None) -> dict:
        prompt = f"""You are the Lead Architect Agent. You need to adjust the book outline based on the user's request.
        
Current Table of Contents:
{json.dumps(current_toc, indent=2)}

Requested Action: {action}
Target Chapter Count: {target_count or "Not specified"}
User Feedback: {feedback or "None"}

Please restructure the outline.
- If Action is 'expand', split chapters or insert new detailed chapters to increase the count.
- If Action is 'condense', merge smaller or related chapters to decrease the count.
- Implement any specific feedback/modifications provided.
- Ensure the new chapter numbers are sequenced strictly starting from 1.

You MUST respond ONLY with a valid JSON object matching the following structure:
{{
  "toc": [
    {{
      "chapterNumber": 1,
      "title": "Chapter Title",
      "summary": "Brief summary of what happens in this chapter.",
      "subtopics": ["Subtopic A", "Subtopic B"]
    }}
  ]
}}
Do not output any introductory or concluding text, backticks, or other formatting. Return ONLY valid, parseable JSON."""
        
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
                "toc": current_toc,
                "error": f"Failed to parse adjusted outline: {str(e)}"
            }

