import logging
from pipeline.agents.base import BaseAgent

logger = logging.getLogger(__name__)

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

HUMANIZER_INSTRUCTIONS = """
HUMANIZER & NATURAL PROSE DIRECTIVES (ACTIVE):
Apply human-like writing dynamics to produce authentic, engaging prose:
1. Vary sentence length and rhythm dramatically (burstiness) — mix short punchy statements with longer, flowing compound sentences.
2. STRICTLY AVOID generic AI stock/transition phrases (e.g., "in today's fast-paced world", "it is important to note", "delve into", "testament to", "game-changer", "moreover", "in conclusion", "tapestry").
3. Use natural contractions (don't, it's, we've) and conversational phrasing where appropriate for the genre.
4. Vary paragraph openings — do not start consecutive paragraphs with identical grammatical patterns or transition words.
5. Avoid repetitive passive constructions; write with strong active verbs and genuine human cadence.
"""

class WriterAgent(BaseAgent):
    def __init__(self, model: str = "gemini-2.5-flash"):
        super().__init__(system_instruction=SYSTEM_INSTRUCTION, model=model)

    async def write_chapter(
        self,
        summary: str,
        discovery_answers: dict,
        locale: str,
        custom_instruction: str = None,
        humanize_output: bool = False,
        guide_notes: str = None,
        min_word_count: int = None
    ) -> str:
        prompt_components = [
            f"Chapter Summary:\n{summary}",
            f"Discovery Answers (Style/Tone preferences):\n{discovery_answers}",
            f"Locale Setting: {locale}"
        ]

        if guide_notes:
            prompt_components.append(f"Author Guide Notes for Chapter Generation:\n{guide_notes}")

        if custom_instruction:
            prompt_components.append(f"AUTHOR NEW DIRECTION / REWRITE INSTRUCTIONS:\n{custom_instruction}")

        if min_word_count and min_word_count > 0:
            prompt_components.append(f"TARGET WORD COUNT: Ensure the chapter contains AT LEAST {min_word_count} words of detailed prose.")

        if humanize_output:
            prompt_components.append(HUMANIZER_INSTRUCTIONS)

        prompt_components.append("Write the full chapter content in clean markdown:")
        prompt = "\n\n".join(prompt_components)

        draft = await self.generate(prompt)
        if not draft:
            draft = ""

        # Minimum word count enforcement loop (up to 2 retries)
        if min_word_count and min_word_count > 0 and draft:
            words = draft.split()
            attempts = 0
            while len(words) < min_word_count and attempts < 2:
                attempts += 1
                logger.info(f"[WRITER] Word count ({len(words)}) below target ({min_word_count}). Expansion attempt {attempts}...")
                expansion_prompt = f"""The following draft has {len(words)} words, which is below our minimum requirement of {min_word_count} words:

{draft}

Please expand this draft by adding deeper analysis, concrete examples, and elaboration on key points without introducing fluff or repetitive text. Output the complete expanded chapter in markdown:"""
                expanded = await self.generate(expansion_prompt)
                if expanded:
                    draft = expanded
                    words = draft.split()
                else:
                    break

        return draft or ""
