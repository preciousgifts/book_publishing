from pipeline.agents.base import BaseAgent

POLISH_INSTRUCTION = """You are the Editor & Grammarian Agent for PublishFlow AI.
Your task is to refine, polish, and edit the drafted chapter text to enhance flow, rhythm, clarity, and grammatical correctness.

Requirements:
1. Do NOT strip or change any structural tags, headers (##, ###), lists, blockquotes, or emphasis formatting (bold, italics) from the input markdown.
2. Polish the cadence, word choice, and phrasing to make it read professionally and seamlessly.
3. Fix any grammar, spelling, punctuation, or formatting inconsistencies.
4. Output only the refined markdown content, with no introductory/concluding explanations or meta-comments.
"""

REWRITE_INSTRUCTION = """You are the Syntactic Rewriter & Plagiarism Avoidance Agent for PublishFlow AI.
Your task is to perform style-shifting and cadence variation checking on the edited chapter text.

Requirements:
1. Force structural sentence variation: mix short, punchy sentences with longer, compound sentences. Vary sentence lengths and structures systematically (cadence variation check).
2. Avoid generic boilerplate phrasing and verbatim match patterns typical of AI models and public training datasets (e.g., "firstly", "moreover", "in conclusion", "it is important to note", "delve", "testament").
3. Enforce original synthesis: express all ideas in unique, fresh language rather than reproducing standard phrases.
4. Ensure explicit attribution: if specific claims, data, or facts are cited, verify that they are accompanied by clear attribution tags (e.g., "According to...", "As documented in...").
5. Do NOT modify structural elements, headings (##, ###), or markdown formatting.
6. Output only the rewritten prose with no introductory or concluding comments.
"""

class EditorAgent(BaseAgent):
    def __init__(self, model: str = "gemini-2.5-flash"):
        # Base class initializes with standard polish instructions
        super().__init__(system_instruction=POLISH_INSTRUCTION, model=model)
        # Dedicated sub-agent instance for syntactic rewrite step
        self.rewriter = BaseAgent(system_instruction=REWRITE_INSTRUCTION, model=model)

    async def edit_chapter(self, draft_text: str) -> str:
        # Step 1: Polish grammar and flow
        polish_prompt = f"""Drafted Chapter Text:
---
{draft_text}
---

Edit and polish this draft:"""
        polished_text = await self.generate(polish_prompt)
        
        # Step 2: Syntactic Rewrite & Cadence Variation Check (Style-Shifting / Plagiarism Avoidance)
        rewrite_prompt = f"""Polished Text:
---
{polished_text}
---

Perform syntactic rewriting, cadence variation, and plagiarism avoidance on this text according to the guidelines:"""
        
        rewritten_text = await self.rewriter.generate(rewrite_prompt)
        return rewritten_text
