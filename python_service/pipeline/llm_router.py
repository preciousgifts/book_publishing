import os
import logging
import asyncio
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


def map_model(provider: str, requested_model: str) -> str:
    """
    Maps a requested model size/type to the closest model available on the provider.
    Handles 'flash' or 'mini' as standard tier, and 'pro' or 'sonnet' as advanced tier.
    """
    model_lower = requested_model.lower()
    is_pro = "pro" in model_lower or "sonnet" in model_lower or (
        "gpt-4o" in model_lower and "mini" not in model_lower)

    if provider == "gemini":
        return "gemini-3.5-flash" if is_pro else "gemini-flash-latest"
    elif provider == "openai":
        return "gpt-4o" if is_pro else "gpt-4o-mini"
    elif provider == "kimi":
        return "moonshot-v1-32k" if is_pro else "moonshot-v1-8k"
    elif provider == "anthropic":
        custom_model = os.getenv("ANTHROPIC_MODEL", "").strip()
        if custom_model:
            return custom_model
        return "claude-3-5-sonnet-latest" if is_pro else "claude-3-5-haiku-latest"
    elif provider == "groq":
        # Groq doesn't have a mini/pro split of the same name, we use Llama 3.3 70B for both as it's highly performant
        return "llama-3.3-70b-versatile"

    return requested_model


class LLMRouter:
    def __init__(self):
        self.active_provider = os.getenv(
            "ACTIVE_LLM_PROVIDER", "gemini").lower()
        self.keys = {
            "gemini": os.getenv("GEMINI_API_KEY", ""),
            "kimi": os.getenv("KIMI_API_KEY", ""),
            "openai": os.getenv("OPENAI_API_KEY", ""),
            "anthropic": os.getenv("ANTHROPIC_AUTH_TOKEN", "") or os.getenv("ANTHROPIC_API_KEY", ""),
            "groq": os.getenv("GROQ_API_KEY", "")
        }
        self._clients = {}

    def _get_client(self, provider: str):
        if provider in self._clients:
            return self._clients[provider]

        key = self.keys.get(provider, "").strip()
        if not key and provider != "anthropic":
            raise ValueError(
                f"API key for LLM provider '{provider}' is not set.")

        if provider == "gemini":
            from google import genai
            client = genai.Client(api_key=key)
        elif provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=key)
        elif provider == "kimi":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                api_key=key, base_url="https://api.moonshot.cn/v1")
        elif provider == "anthropic":
            base_url = os.getenv("ANTHROPIC_BASE_URL", "https://agentrouter.org").strip()
            auth_token = os.getenv("ANTHROPIC_AUTH_TOKEN", "").strip() or os.getenv("ANTHROPIC_API_KEY", "").strip() or key
            
            # If base_url points to an OpenAI-compatible gateway like AgentRouter, use AsyncOpenAI with Bearer auth scheme
            if "agentrouter" in base_url.lower() or "/v1" in base_url:
                from openai import AsyncOpenAI
                target_base = base_url if base_url.endswith("/v1") else f"{base_url.rstrip('/')}/v1"
                client = AsyncOpenAI(
                    api_key=auth_token,
                    base_url=target_base,
                    default_headers={"Authorization": f"Bearer {auth_token}"}
                )
                client._is_agentrouter = True
            else:
                from anthropic import AsyncAnthropic
                kwargs = {}
                if auth_token:
                    kwargs["api_key"] = auth_token
                if base_url:
                    kwargs["base_url"] = base_url
                client = AsyncAnthropic(**kwargs)
        elif provider == "groq":
            from groq import AsyncGroq
            client = AsyncGroq(api_key=key)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

        self._clients[provider] = client
        return client

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        return await self._call_with_fallback(
            prompt=prompt,
            system_instruction=system_instruction,
            model=model,
            temperature=temperature,
            is_json=False
        )

    async def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        return await self._call_with_fallback(
            prompt=prompt,
            system_instruction=system_instruction,
            model=model,
            temperature=temperature,
            is_json=True
        )

    async def _call_with_fallback(
        self,
        prompt: str,
        system_instruction: Optional[str],
        model: Optional[str],
        temperature: float,
        is_json: bool
    ) -> str:
        providers_to_try = [self.active_provider]

        # Add other configured backup providers
        for p, key in self.keys.items():
            if p != self.active_provider and key.strip():
                providers_to_try.append(p)

        errors = []
        for provider in providers_to_try:
            try:
                logger.info(
                    f"Attempting LLM generation with provider: {provider}")
                result = await self._execute_call(
                    provider=provider,
                    prompt=prompt,
                    system_instruction=system_instruction,
                    requested_model=model,
                    temperature=temperature,
                    is_json=is_json
                )
                return result
            except Exception as e:
                logger.warning(f"LLM provider '{provider}' call failed: {e}")
                errors.append(f"{provider}: {str(e)}")

        raise RuntimeError(
            f"All LLM providers failed. Attempts summary: {'; '.join(errors)}")

    async def _execute_call(
        self,
        provider: str,
        prompt: str,
        system_instruction: Optional[str],
        requested_model: Optional[str],
        temperature: float,
        is_json: bool
    ) -> str:
        client = self._get_client(provider)
        req_model = requested_model or "gemini-flash-latest"
        model_name = map_model(provider, req_model)

        if provider == "gemini":
            from google.genai import types
            mime_type = "application/json" if is_json else "text/plain"

            afc_max_calls = int(os.getenv("GEMINI_MAX_REMOTE_CALLS", "10"))
            afc_disabled = os.getenv("GEMINI_DISABLE_AFC", "false").lower() == "true"
            afc_config = types.AutomaticFunctionCallingConfig(
                disable=afc_disabled,
                maximum_remote_calls=afc_max_calls
            )

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type=mime_type,
                temperature=temperature,
                automatic_function_calling=afc_config
            )

            models_to_try = [model_name, "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"]
            dedup_models = []
            for m in models_to_try:
                if m not in dedup_models:
                    dedup_models.append(m)

            last_exception = None
            for g_model in dedup_models:
                for attempt in range(1, 4):
                    try:
                        response = await client.aio.models.generate_content(
                            model=g_model,
                            contents=prompt,
                            config=config
                        )
                        return response.text
                    except Exception as aio_err:
                        last_exception = aio_err
                        err_str = str(aio_err)
                        if ("503" in err_str or "UNAVAILABLE" in err_str) and attempt < 3:
                            logger.warning(f"Gemini {g_model} 503 spike encountered. Retrying attempt {attempt+1}/3 in {attempt * 2}s...")
                            await asyncio.sleep(attempt * 2)
                            continue

                        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                            logger.warning(f"Gemini {g_model} 429 quota/rate limit encountered. Trying next model...")
                            break

                        logger.warning(
                            f"Gemini {g_model} AIO failed, using thread executor sync fallback: {aio_err}")
                        try:
                            loop = asyncio.get_running_loop()
                            def sync_generate(m=g_model):
                                return client.models.generate_content(
                                    model=m,
                                    contents=prompt,
                                    config=config
                                )
                            response = await loop.run_in_executor(None, sync_generate)
                            return response.text
                        except Exception as sync_err:
                            last_exception = sync_err
                            break

            raise last_exception

        elif provider in ("openai", "kimi"):
            messages = []
            if system_instruction:
                messages.append(
                    {"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature
            }
            if is_json:
                kwargs["response_format"] = {"type": "json_object"}

            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content

        elif provider == "anthropic":
            if getattr(client, "_is_agentrouter", False):
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature
                }
                if is_json:
                    kwargs["response_format"] = {"type": "json_object"}

                response = await client.chat.completions.create(**kwargs)
                return response.choices[0].message.content
            else:
                system_arg = system_instruction if system_instruction else None
                local_prompt = prompt
                if is_json:
                    local_prompt += "\n\nReturn ONLY a valid JSON object. Do not include markdown formatting or extra text."

                response = await client.messages.create(
                    model=model_name,
                    max_tokens=4000,
                    temperature=temperature,
                    system=system_arg,
                    messages=[
                        {"role": "user", "content": local_prompt}
                    ]
                )
                return response.content[0].text

        elif provider == "groq":
            messages = []
            if system_instruction:
                messages.append(
                    {"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature
            }
            if is_json:
                kwargs["response_format"] = {"type": "json_object"}

            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content

        else:
            raise ValueError(f"Unknown provider: {provider}")
