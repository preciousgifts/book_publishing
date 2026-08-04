from pipeline.agents.base import BaseAgent

SYSTEM_INSTRUCTION = """You are the Content Writer Agent for PublishFlow AI.
Your task is to write a highly detailed, professional, and engaging book chapter based on the provided chapter summary, discovery answers, and language locale.

Requirements:
1. Enforce strict localized spelling rules:
   - For 'en-US': use American English (e.g., color, behavior, realize, theater, program).
   - For 'en-GB': use British English (e.g., colour, behaviour, realise, theatre, programme).
2. Output the content in clean Markdown.
3. Organize the text logically with headings (##, ###). Do NOT use H1 (#) since that is reserved for the book/chapter title itself.
4. Separate paragraphs with double newlines (\\n\\n).
5. Ensure the chapter is comprehensive, rich, and flows smoothly. Do not output any notes, comments, meta-discussions, or wrapper text. Start writing the chapter directly.
"""

class WriterAgent(BaseAgent):
    def __init__(self, model: str = "gemini-2.5-flash"):
        super().__init__(system_instruction=SYSTEM_INSTRUCTION, model=model)

    async def write_chapter(self, summary: str, discovery_answers: dict, locale: str) -> str:
        prompt = f"""Chapter Summary:
{summary}

Discovery Answers (Style/Tone preferences):
{discovery_answers}

Locale Setting: {locale}

Write the full chapter content in markdown:"""
        
        return await self.generate(prompt)
