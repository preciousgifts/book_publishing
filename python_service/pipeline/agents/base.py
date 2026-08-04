from pipeline.llm_router import LLMRouter

class BaseAgent:
    def __init__(self, system_instruction: str = None, model: str = "gemini-2.5-flash"):
        """
        Base Agent wraps LLMRouter.
        """
        self.router = LLMRouter()
        self.model = model
        self.system_instruction = system_instruction

    async def generate(self, prompt: str, response_mime_type: str = "text/plain") -> str:
        """
        Generates content using the LLMRouter asynchronously.
        """
        if response_mime_type == "application/json":
            return await self.router.generate_json(
                prompt=prompt,
                system_instruction=self.system_instruction,
                model=self.model
            )
        else:
            return await self.router.generate_text(
                prompt=prompt,
                system_instruction=self.system_instruction,
                model=self.model
            )
