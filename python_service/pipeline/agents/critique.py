import json
import re
import logging
import asyncio
from pipeline.agents.base import BaseAgent
from pipeline.utils.web_search import search_duckduckgo

logger = logging.getLogger(__name__)

CLAIM_EXTRACTION_INSTRUCTION = """You are a Fact-Checking Claim Extractor.
Analyze the provided text and extract ALL key factual claims, including:
1. Named entities (people, organizations, locations, products) associated with specific assertions.
2. Statistics, metrics, data points, and numerical assertions.
3. Historical dates, event timelines, and chronological assertions.
4. Cited claims, quotes, or references to research/sources.

For each extracted factual claim, generate a specific search query that can be used to verify it.
Return ONLY a valid JSON list of objects, where each object has:
- "claim": The exact factual statement from the text.
- "query": A concise search query for DuckDuckGo to verify the claim.

If no claims require verification, return an empty list: [].
Do not output markdown code formatting (like ```json), just return raw JSON.
"""

AUDIT_INSTRUCTION = """You are the Authenticity & Fact Auditor Agent for PublishFlow AI.
Your task is to audit the provided text against the retrieved web search evidence to perform strict anti-hallucination verification.

Requirements:
1. Review each factual claim in the text.
2. Cross-verify each claim against the retrieved search evidence snippet context.
3. If the search evidence contradicts a claim, or if the search evidence does not verify/support the claim (making it an unverified claim), you MUST insert a flag immediately after the claim:
   [FLAG: Review Needed - Unverified Claim: <Brief description of mismatch or contradiction>]
   If no evidence was found at all for the claim, use:
   [FLAG: Review Needed - Unverified Claim]
4. Do not modify the original text style, structure, headings, or flow unless inserting a flag.
5. Output only the audited prose, with no introductory or concluding meta-comments.
"""

class CritiqueAgent(BaseAgent):
    def __init__(self, model: str = "gemini-2.5-flash"):
        super().__init__(model=model)

    async def audit_content(self, prose: str, genre: str) -> tuple[str, list]:
        """
        Audits content. For non-fiction, extracts assertions, performs DuckDuckGo search,
        audits them, and returns prose with embedded inline flags, along with a list of flags.
        For fiction, skips web search and returns original prose unchanged.
        """
        if genre.lower() != "non-fiction":
            return prose, []

        try:
            # 1. Extract claims
            extractor = BaseAgent(system_instruction=CLAIM_EXTRACTION_INSTRUCTION, model=self.model)
            claims_json = await extractor.generate(prose, response_mime_type="application/json")
            if not claims_json:
                claims_json = "[]"
            
            clean_json = claims_json.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            claims_data = json.loads(clean_json) if clean_json else []
            if not isinstance(claims_data, list):
                claims_data = []
        except Exception as e:
            logger.error(f"Failed to extract claims: {e}")
            claims_data = []

        # 2. Query DuckDuckGo for evidence concurrently with a 5s timeout per search
        async def fetch_evidence(item):
            claim = item.get("claim", "")
            query = item.get("query", "")
            if not claim or not query:
                return None
            try:
                results = await asyncio.wait_for(
                    asyncio.to_thread(search_duckduckgo, query, 2),
                    timeout=5.0
                )
                snippets = [r.get("body", "") for r in results if "body" in r]
                return {
                    "claim": claim,
                    "evidence": " | ".join(snippets)[:400] if snippets else "No evidence found."
                }
            except Exception as search_err:
                logger.warning(f"Web search for claim '{claim[:30]}' timed out or failed: {search_err}")
                return {
                    "claim": claim,
                    "evidence": "No evidence found (search timeout)."
                }

        tasks = [fetch_evidence(item) for item in claims_data[:4]]
        results_list = await asyncio.gather(*tasks)
        evidence = [r for r in results_list if r is not None]

        # If no evidence was queried, return prose
        if not evidence:
            return prose, []

        # 3. Audit prose
        auditor = BaseAgent(system_instruction=AUDIT_INSTRUCTION, model=self.model)
        evidence_prompt = f"""Original Prose:
---
{prose}
---

Search Evidence:
{json.dumps(evidence, indent=2)}

Audit the prose and insert flags [FLAG: Review Needed - Unverified Claim: <Reason>] or [FLAG: Review Needed - Unverified Claim] where appropriate:"""

        audited_prose = await auditor.generate(evidence_prompt)
        if not audited_prose:
            audited_prose = prose

        # 4. Extract flags to return status flags list
        status_flags = []
        flags_found = re.findall(r'\[FLAG:\s*Review Needed\s*-\s*([^\]]+)\]', audited_prose)
        for f in flags_found:
            status_flags.append({
                "type": "fact_check",
                "message": f.strip()
            })

        return audited_prose, status_flags
