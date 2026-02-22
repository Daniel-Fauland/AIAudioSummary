import datetime
from typing import Union, AsyncGenerator

from pydantic import BaseModel as PydanticBaseModel, Field as PydanticField
from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.azure import AzureProvider
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from models.llm import LLMProvider, AzureConfig, LangdockConfig, CreateSummaryRequest, ExtractKeyPointsRequest, ExtractKeyPointsResponse
from service.misc.core import MiscService


class _SpeakerEntry(PydanticBaseModel):
    speaker: str = PydanticField(..., description="Speaker label (e.g. 'Speaker A')")
    summary: str = PydanticField(..., description="1-3 sentence key point summary for this speaker")


class _SpeakerKeyPointsResult(PydanticBaseModel):
    entries: list[_SpeakerEntry] = PydanticField(..., description="Key point summaries for each speaker")

helper = MiscService()


class LLMService:
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
                return OpenAIChatModel(
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

    async def generate_summary(self, request: CreateSummaryRequest) -> Union[str, AsyncGenerator[str, None]]:
        """Generate a summary using the specified LLM provider.

        Args:
            request: The summary request with provider, model, key, prompt, and text.

        Returns:
            Either a string (complete response) or an async generator (streaming chunks).
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
            model_settings=ModelSettings(temperature=0.5)
        )

        if request.stream:
            return self._stream_response(agent, user_prompt)
        else:
            result = await agent.run(user_prompt)
            return result.output

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
        user_prompt = (
            f"Speakers: {speakers_list}\n\n"
            f"Transcript:\n{request.transcript}"
        )

        agent = Agent(
            model,
            system_prompt=system_prompt,
            output_type=_SpeakerKeyPointsResult,
            model_settings=ModelSettings(temperature=0.3)
        )

        result = await agent.run(user_prompt)
        key_points = {entry.speaker: entry.summary for entry in result.output.entries}
        return ExtractKeyPointsResponse(key_points=key_points)

    async def _stream_response(self, agent: Agent, user_prompt: str) -> AsyncGenerator[str, None]:
        """Stream response chunks from the LLM agent."""
        async with agent.run_stream(user_prompt) as stream:
            async for chunk in stream.stream_text(delta=True):
                yield chunk
