import logging
from typing import Dict, Any, List
from pipeline.agents.base import BaseAgent
from pipeline.agents.writer import HUMANIZER_INSTRUCTIONS

logger = logging.getLogger(__name__)

MATTER_SYSTEM_INSTRUCTION = """You are the specialized Front & Back Matter Writer Agent for PublishFlow AI.
Your job is to generate clean, professional, print-ready HTML/Markdown content for Amazon KDP front and back matter pages.

Guidelines:
1. Output clear, valid HTML formatted with semantic elements (<p>, <h1>, <h2>, <h3>, <blockquote>, <ul>, <li>).
2. Follow strict KDP publishing standards for each page type.
3. Do not include meta-commentary, code wrappers (like ```html), or conversational preambles. Output only the page content.
4. Adhere to author inputs strictly and never fabricate non-factual quotes attributed to real living people.
"""

class MatterWriterAgent(BaseAgent):
    def __init__(self, model: str = "pro"):
        super().__init__(system_instruction=MATTER_SYSTEM_INSTRUCTION, model=model)

    async def generate_matter_page(
        self,
        page_type: str,
        title: str,
        genre: str,
        locale: str,
        author_inputs: Dict[str, Any],
        toc_list: List[Dict[str, Any]],
        paragraphs_sample: List[Dict[str, Any]],
        custom_instruction: str = None,
        humanize_output: bool = False
    ) -> str:
        author_inputs = author_inputs or {}
        prompt_parts = [
            f"Book Title: {title}",
            f"Genre: {genre}",
            f"Locale: {locale}",
            f"Target Page Type: {page_type}"
        ]

        if custom_instruction:
            prompt_parts.append(f"Author Directives: {custom_instruction}")

        if humanize_output:
            prompt_parts.append(HUMANIZER_INSTRUCTIONS)

        # Page specific instructions
        if page_type == 'title_page':
            author_name = author_inputs.get('authorOverride') or author_inputs.get('authorName') or 'The Author'
            subtitle = author_inputs.get('subtitleOverride') or author_inputs.get('subtitle') or ''
            prompt_parts.append(f"""Generate a clean Title Page.
Author Name: {author_name}
Subtitle: {subtitle}
Format with centered text alignment:
<div style="text-align: center;">
  <h1 style="font-size: 28pt; margin-bottom: 12pt;">{title}</h1>
  {f'<h2 style="font-size: 16pt; margin-bottom: 24pt;">{subtitle}</h2>' if subtitle else ''}
  <p style="font-size: 14pt; margin-top: 36pt;">By {author_name}</p>
</div>""")

        elif page_type == 'copyright_page':
            year = author_inputs.get('copyrightYear') or '2026'
            holder = author_inputs.get('copyrightHolder') or author_inputs.get('authorName') or title
            isbn = author_inputs.get('isbn') or ''
            custom_rights = author_inputs.get('customRights') or 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without prior written permission of the publisher.'
            ai_disclosure_enabled = author_inputs.get('aiDisclosureEnabled', True)
            ai_disclosure_text = author_inputs.get('aiDisclosureText') or 'This work was created with AI assistance.'

            disclosure_html = f'<p style="margin-top: 12pt; font-style: italic;">{ai_disclosure_text}</p>' if ai_disclosure_enabled else ''
            isbn_html = f'<p>ISBN: {isbn}</p>' if isbn else ''

            prompt_parts.append(f"""Generate a standard KDP Copyright Page.
Format as small, left-aligned, single-spaced block text:
<div style="font-size: 9pt; line-height: 1.3; text-align: left;">
  <p>Copyright © {year} by {holder}</p>
  <p>{custom_rights}</p>
  {isbn_html}
  {disclosure_html}
</div>""")

        elif page_type == 'dedication':
            prompt_text = author_inputs.get('promptText') or author_inputs.get('dedicationTo') or 'To the reader.'
            prompt_parts.append(f"""Generate a heartfelt, short Dedication page passage based on author input:
Author input: "{prompt_text}"
Format as centered italicized text:
<div style="text-align: center; margin-top: 20%; font-style: italic;">
  <p>[Your refined dedication text here]</p>
</div>""")

        elif page_type == 'epigraph':
            quote_text = author_inputs.get('quoteText') or ''
            quote_source = author_inputs.get('quoteSource') or ''
            suggest_theme = author_inputs.get('aiSuggestTheme') or ''

            if suggest_theme:
                prompt_parts.append(f"""The author asked for a public-domain quotation suggestion on theme: "{suggest_theme}".
CRITICAL REQUIREMENT: Only surface a real, verifiably public domain quote (e.g. Marcus Aurelius, Shakespeare, Emerson). Do NOT fabricate a quote.
Format as:
<blockquote style="text-align: center; font-style: italic;">
  <p>"[Public Domain Quote]"</p>
  <p style="text-align: right; font-style: normal;">— [Author/Source]</p>
</blockquote>
<p style="font-size: 8pt; color: #666; text-align: center; margin-top: 10px;">* Note: Public-domain suggestion. Please verify before publication.</p>""")
            else:
                prompt_parts.append(f"""Format the author-provided quotation and source:
Quote: "{quote_text}"
Source: "{quote_source}"
Format as centered/right-aligned blockquote:
<blockquote style="text-align: center; font-style: italic;">
  <p>"{quote_text}"</p>
  <p style="text-align: right; font-style: normal;">— {quote_source}</p>
</blockquote>""")

        elif page_type == 'foreword':
            foreword_by = author_inputs.get('forewordBy') or 'Guest Contributor'
            relationship = author_inputs.get('relationship') or ''
            prompt_parts.append(f"""Draft a compelling Foreword for "{title}".
Attributed to: {foreword_by}
Contributor relationship/notes: {relationship}
Chapter outline context: {toc_list[:5]}

IMPORTANT UI NOTICE REQUIREMENT: Include a clear top notice:
<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; font-size: 9pt; color: #166534; margin-bottom: 16px;">
  <strong>Draft Notice:</strong> Written on behalf of {foreword_by} — must be reviewed and approved by them before publishing.
</div>

Follow with 3-4 paragraphs of inspiring foreword prose introducing the author and manuscript themes.""")

        elif page_type == 'preface':
            notes = author_inputs.get('notes') or ''
            prompt_parts.append(f"""Draft a Preface for "{title}" in author's voice.
Author background notes: {notes}
Chapter outline context: {toc_list[:5]}
Write 3-5 engaging body paragraphs outlining why this book was written.""")

        elif page_type == 'introduction':
            notes = author_inputs.get('notes') or ''
            prompt_parts.append(f"""Draft a strong, engaging Introduction for "{title}".
Notes: {notes}
Chapter summaries: {toc_list}
Write 4-6 detailed paragraphs introducing key themes and what readers will learn/experience.""")

        elif page_type == 'acknowledgments':
            names = author_inputs.get('namesToThank') or author_inputs.get('names') or 'editors, family, and early readers'
            prompt_parts.append(f"""Draft a warm, polite Acknowledgments section thanking:
Names/groups: {names}
Write 3-4 paragraphs of smooth prose expressing gratitude.""")

        elif page_type == 'table_of_contents':
            # Dynamic Table of Contents builder prompt
            chapters_formatted = "".join([f'<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Chapter {ch.get("chapterNumber", idx+1)}: {ch.get("title", "")}</span><span style="border-bottom: 1px dotted #999; flex: 1; margin: 0 8px;"></span></div>' for idx, ch in enumerate(toc_list)])
            prompt_parts.append(f"""Format a clean Table of Contents overview for "{title}".
Chapters:
{chapters_formatted}
Format as clean, styled HTML list of chapters with leaders.""")

        elif page_type == 'glossary':
            terms_input = author_inputs.get('additionalTerms') or ''
            sample_text = " ".join([p.get('rawContent', '') for p in paragraphs_sample])
            prompt_parts.append(f"""Generate an alphabetized Glossary for "{title}".
Author terms: {terms_input}
Manuscript sample context: {sample_text[:1500]}
Format as an alphabetized list of 10-15 key terms with clear definitions:
<dl>
  <dt><strong>Term</strong></dt>
  <dd>Definition of the term...</dd>
</dl>""")

        elif page_type == 'appendix':
            notes = author_inputs.get('notes') or ''
            prompt_parts.append(f"""Draft an Appendix for "{title}".
Notes: {notes}
Chapter outline context: {toc_list}
Provide structured supplementary material, key frameworks, or reference checklists.""")

        elif page_type == 'bibliography':
            sources = author_inputs.get('sources') or ''
            prompt_parts.append(f"""Generate an Endnotes / Bibliography section for "{title}".
Author sources: {sources}
Provide structured citation references and recommended reading list.""")

        elif page_type == 'index':
            terms = author_inputs.get('terms') or ''
            prompt_parts.append(f"""Generate an Index section for "{title}".
Terms: {terms}
Provide an alphabetized index of key topics and concepts.""")

        elif page_type == 'about_author':
            bio = author_inputs.get('bioNotes') or author_inputs.get('bio') or ''
            prompt_parts.append(f"""Draft an engaging "About the Author" page for "{title}".
Author Bio Notes: {bio}
Write 2-3 professional paragraphs detailing author expertise, background, and mission.""")

        elif page_type == 'also_by_author':
            titles_input = author_inputs.get('otherTitles') or ''
            prompt_parts.append(f"""Draft an "Also By the Author" page.
Titles provided: {titles_input}
Format as a clean, elegant list of publications by the author.""")

        elif page_type == 'discussion_questions':
            themes = author_inputs.get('themeNotes') or ''
            prompt_parts.append(f"""Generate 8-12 thoughtful Book Club & Discussion Questions for "{title}".
Themes to emphasize: {themes}
Chapter topics: {[ch.get('title') for ch in toc_list]}
Format as a numbered list (<ol><li>...</li></ol>).""")

        elif page_type == 'call_to_action':
            tone = author_inputs.get('callToActionTone') or 'friendly'
            website = author_inputs.get('websiteUrl') or ''
            prompt_parts.append(f"""Draft a warm, persuasive Call-to-Action / Review Request page for "{title}".
Tone: {tone}
Website: {website}
Ask readers to leave an honest review on Amazon and connect with the author.""")

        prompt = "\n\n".join(prompt_parts)
        draft = await self.generate(prompt)
        return draft or f"<p>Content generated for {page_type}.</p>"
