import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pipeline.llm_router import LLMRouter, map_model
from pipeline.agents.critique import CritiqueAgent
from pipeline.agents.editor import EditorAgent

def test_model_mapping():
    assert map_model("gemini", "gemini-2.5-flash") == "gemini-flash-latest"
    assert map_model("gemini", "gemini-2.5-pro") == "gemini-3.5-flash"
    assert map_model("openai", "flash") == "gpt-4o-mini"
    assert map_model("openai", "pro") == "gpt-4o"
    with patch.dict("os.environ", {}, clear=False):
        import os
        os.environ.pop("ANTHROPIC_MODEL", None)
        assert map_model("anthropic", "standard") == "claude-3-5-haiku-latest"
        assert map_model("anthropic", "sonnet") == "claude-3-5-sonnet-latest"
    assert map_model("kimi", "flash") == "moonshot-v1-8k"
    assert map_model("kimi", "pro") == "moonshot-v1-32k"
    assert map_model("groq", "any") == "llama-3.3-70b-versatile"

@pytest.mark.asyncio
@patch("pipeline.llm_router.LLMRouter._execute_call")
async def test_router_fallback(mock_execute):
    router = LLMRouter()
    router.active_provider = "openai"
    router.keys = {
        "openai": "mock-key",
        "gemini": "mock-key",
        "anthropic": ""
    }
    
    # First provider fails, second succeeds
    mock_execute.side_effect = [
        RuntimeError("OpenAI rate limit"),
        "Gemini response"
    ]
    
    res = await router.generate_text("Hello")
    assert res == "Gemini response"
    assert mock_execute.call_count == 2
    
    # Verify call parameters
    mock_execute.assert_any_call(
        provider="openai",
        prompt="Hello",
        system_instruction=None,
        requested_model=None,
        temperature=0.7,
        is_json=False
    )
    mock_execute.assert_any_call(
        provider="gemini",
        prompt="Hello",
        system_instruction=None,
        requested_model=None,
        temperature=0.7,
        is_json=False
    )

@pytest.mark.asyncio
@patch("pipeline.agents.base.BaseAgent.generate")
@patch("pipeline.agents.critique.search_duckduckgo")
async def test_critique_agent_flagging(mock_search, mock_generate):
    mock_search.return_value = [{"title": "Search result", "body": "Paris is the capital of France"}]
    
    # 1st generate call is for claim extraction
    # 2nd generate call is for auditing
    mock_generate.side_effect = [
        '[{"claim": "Paris is the capital of France", "query": "capital of France"}]',
        'Paris is the capital of France. [FLAG: Review Needed - Unverified Claim]'
    ]
    
    agent = CritiqueAgent()
    audited, flags = await agent.audit_content("Paris is the capital of France", "non-fiction")
    
    assert "[FLAG: Review Needed - Unverified Claim]" in audited
    assert len(flags) == 1
    assert flags[0]["message"] == "Unverified Claim"

@pytest.mark.asyncio
@patch("pipeline.agents.base.BaseAgent.generate")
async def test_editor_agent_two_steps(mock_generate):
    # 1st call is polish, 2nd call is rewrite
    mock_generate.side_effect = [
        "Polished chapter text",
        "Syntactically rewritten chapter text"
    ]
    
    agent = EditorAgent()
    res = await agent.edit_chapter("Original chapter text")
    assert res == "Syntactically rewritten chapter text"
    assert mock_generate.call_count == 2
