import datetime
from typing import Union, AsyncGenerator

from openai._types import NOT_GIVEN
from pydantic import BaseModel as PydanticBaseModel, Field as PydanticField
from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.azure import AzureProvider
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from models.llm import LLMProvider, AzureConfig, LangdockConfig, CreateSummaryRequest, ExtractKeyPointsRequest, ExtractKeyPointsResponse
from service.misc.core import MiscService


class LangdockOpenAIChatModel(OpenAIChatModel):
    """OpenAI-compatible model for Langdock that suppresses unsupported stream_options."""

    def _get_stream_options(self, model_settings: OpenAIChatModelSettings):
        # Langdock does not support the stream_options parameter.
        return NOT_GIVEN


class _SpeakerEntry(PydanticBaseModel):
    speaker: str = PydanticField(...,
                                 description="Speaker label (e.g. 'Speaker A')")
    summary: str = PydanticField(
        ..., description="1-3 sentence key point summary for this speaker")


class _SpeakerKeyPointsResult(PydanticBaseModel):
    entries: list[_SpeakerEntry] = PydanticField(
        ..., description="Key point summaries for each speaker")


class _SpeakerEntryWithName(PydanticBaseModel):
    speaker: str = PydanticField(...,
                                 description="Speaker label (e.g. 'Speaker A')")
    summary: str = PydanticField(
        ..., description="1-3 sentence key point summary for this speaker")
    identified_name: str = PydanticField(
        "", description="The real name of this speaker if clearly and explicitly mentioned in the transcript. Leave empty if not identifiable.")


class _SpeakerKeyPointsWithNamesResult(PydanticBaseModel):
    entries: list[_SpeakerEntryWithName] = PydanticField(
        ..., description="Key point summaries with optional identified names for each speaker")


helper = MiscService()


_LANGDOCK_GPT_MAX_TOKENS = 128_000


class LLMService:
    @staticmethod
    def build_model_settings(provider: LLMProvider, model_name: str, **kwargs) -> ModelSettings:
        """Build ModelSettings, capping max_tokens for Langdock GPT models.

        Langdock GPT models are currently disabled in the UI due to a proxy bug
        (see user_stories/langdock_openai_bug_report.md), but this guard remains
        so re-enabling them later just works.
        """
        if (
            provider == LLMProvider.LANGDOCK
            and not model_name.startswith(("claude", "gemini"))
            and "max_tokens" not in kwargs
        ):
            kwargs["max_tokens"] = _LANGDOCK_GPT_MAX_TOKENS
        return ModelSettings(**kwargs)

    def _create_model(self, provider: LLMProvider, model_name: str, api_key: str,
                      azure_config: AzureConfig | None = None,
                      langdock_config: LangdockConfig | None = None):
        """Create the appropriate pydantic-ai model based on the provider."""
        if provider == LLMProvider.OPENAI:
            return OpenAIChatModel(
                model_name,
                provider=OpenAIProvider(api_key=api_key)
            )
        elif provider == LLMProvider.ANTHROPIC:
            return AnthropicModel(
                model_name,
                provider=AnthropicProvider(api_key=api_key)
            )
        elif provider == LLMProvider.GEMINI:
            return GoogleModel(
                model_name,
                provider=GoogleProvider(api_key=api_key)
            )
        elif provider == LLMProvider.AZURE_OPENAI:
            return OpenAIChatModel(
                model_name,
                provider=AzureProvider(
                    azure_endpoint=azure_config.azure_endpoint,
                    api_version=azure_config.api_version,
                    api_key=api_key,
                )
            )
        elif provider == LLMProvider.LANGDOCK:
            from anthropic import AsyncAnthropic
            region = langdock_config.region if langdock_config else "eu"
            if model_name.startswith("claude"):
                client = AsyncAnthropic(
                    base_url=f"https://api.langdock.com/anthropic/{region}/",
                    api_key=api_key
                )
                return AnthropicModel(model_name, provider=AnthropicProvider(anthropic_client=client))
            elif model_name.startswith("gemini"):
                return GoogleModel(
                    model_name,
                    provider=GoogleProvider(
                        api_key=api_key,
                        base_url=f"https://api.langdock.com/google/{region}/"
                    )
                )
            else:
                return LangdockOpenAIChatModel(
                    model_name,
                    provider=OpenAIProvider(
                        api_key=api_key,
                        base_url=f"https://api.langdock.com/openai/{region}/v1"
                    )
                )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def build_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        target_language: str,
        informal_german: bool = True,
        date: datetime.date | None = None,
        author: str | None = None
    ) -> tuple[str, str]:
        """Build the system and user prompts for the LLM."""
        date = date or datetime.date.today()
        day_of_the_week = await helper.get_day_of_week(date, country_code="DE")
        target_language_lower = target_language.lower()

        if target_language_lower == "german":
            tone = (
                "Use informal German 'du' & 'ihr' instead of 'Sie'."
                if informal_german
                else "Use formal German 'Sie' instead of 'du' or 'ihr'."
            )
            system_prompt = f"{system_prompt}\nYour Summary must be in German. {tone}"
        else:
            system_prompt = f"{system_prompt}\nYour Summary must be in {target_language}"

        if author:
            system_prompt = (
                f"{system_prompt}\n"
                f"Author/POV: {author}. Write from this person's perspective. "
                f"If the output includes an email or letter, sign off with this name."
            )

        user_prompt = (
            f"Please summarize the following transcription:\n\n"
            f"Recording Date: {day_of_the_week} - {date}\n{user_prompt}"
        )
        return system_prompt, user_prompt

    async def generate_summary(self, request: CreateSummaryRequest) -> Union[str, tuple[str, object], AsyncGenerator[str, None]]:
        """Generate a summary using the specified LLM provider.

        Args:
            request: The summary request with provider, model, key, prompt, and text.

        Returns:
            Streaming: async generator of string chunks (usage marker appended at end).
            Non-streaming: tuple of (output_text, usage).
        """
        # Use deployment_name as model name for Azure OpenAI
        model_name = request.model
        if request.provider == LLMProvider.AZURE_OPENAI and request.azure_config:
            model_name = request.azure_config.deployment_name

        model = self._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config
        )

        system_prompt, user_prompt = await self.build_prompt(
            system_prompt=request.system_prompt,
            user_prompt=request.text,
            target_language=request.target_language,
            informal_german=request.informal_german,
            date=request.date,
            author=request.author
        )

        agent = Agent(
            model,
            system_prompt=system_prompt,
            model_settings=self.build_model_settings(request.provider, model_name, temperature=0.5)
        )

        if request.stream:
            return self._stream_response(agent, user_prompt)
        else:
            result = await agent.run(user_prompt)
            return result.output, result.usage()

    async def extract_key_points(self, request: ExtractKeyPointsRequest) -> ExtractKeyPointsResponse:
        """Extract 1-3 sentence key point summaries per speaker from a transcript."""
        model_name = request.model
        if request.provider == LLMProvider.AZURE_OPENAI and request.azure_config:
            model_name = request.azure_config.deployment_name

        model = self._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config
        )

        speakers_list = ", ".join(request.speakers)
        system_prompt = (
            "You are an assistant that analyzes meeting transcripts. "
            "For each speaker listed, provide a 1-3 sentence summary of their key points and contributions. "
            "Focus on what each speaker talked about, their main arguments, and any decisions they made. "
            "Include an entry for every speaker in the list, even if they had minimal contributions."
        )

        if request.identify_speakers:
            system_prompt += (
                "\n\nAdditionally, for each speaker, try to identify their real name from the transcript. "
                "Only provide a name if it is clearly and explicitly mentioned in the transcript "
                "(e.g., someone addresses them by name, they introduce themselves). "
                "Do NOT guess, infer, or hallucinate names. "
                "If a speaker's name is not clearly identifiable, leave identified_name as an empty string."
            )
            output_type = _SpeakerKeyPointsWithNamesResult
        else:
            output_type = _SpeakerKeyPointsResult

        user_prompt = (
            f"Speakers: {speakers_list}\n\n"
            f"Transcript:\n{request.transcript}"
        )

        agent = Agent(
            model,
            system_prompt=system_prompt,
            output_type=output_type,
            model_settings=self.build_model_settings(request.provider, model_name, temperature=0.3)
        )

        result = await agent.run(user_prompt)
        key_points = {
            entry.speaker: entry.summary for entry in result.output.entries}

        speaker_labels = {}
        if request.identify_speakers:
            for entry in result.output.entries:
                if entry.identified_name:
                    speaker_labels[entry.speaker] = entry.identified_name

        return ExtractKeyPointsResponse(key_points=key_points, speaker_labels=speaker_labels)

    async def _stream_response(self, agent: Agent, user_prompt: str) -> AsyncGenerator[str, None]:
        """Stream response chunks from the LLM agent."""
        import json as _json
        has_yielded = False
        try:
            async with agent.run_stream(user_prompt) as stream:
                async for chunk in stream.stream_text(delta=True):
                    has_yielded = True
                    yield chunk
                # After stream completes, yield usage marker
                try:
                    usage = stream.usage()
                    usage_data = _json.dumps({
                        "input_tokens": usage.request_tokens or 0,
                        "output_tokens": usage.response_tokens or 0,
                        "total_tokens": (usage.request_tokens or 0) + (usage.response_tokens or 0),
                    })
                    yield f"\n\n<!--TOKEN_USAGE:{usage_data}-->"
                except Exception:
                    pass
        except RuntimeError as e:
            if "cancel scope" in str(e) and has_yielded:
                return
            from utils.logging import logger
            logger.error(f"LLM streaming error: {e}")
            if has_yielded:
                yield f"\n\n<!--STREAM_ERROR:{e}-->"
            else:
                raise
        except Exception as e:
            from utils.logging import logger
            logger.error(f"LLM streaming error: {e}")
            if has_yielded:
                # Mid-stream error: yield marker instead of raising — raising
                # kills the HTTP connection (broken chunked encoding → nginx 502).
                yield f"\n\n<!--STREAM_ERROR:{e}-->"
            else:
                # Initial error (no data sent yet): re-raise so the router
                # can return a proper HTTP error response.
                raise
