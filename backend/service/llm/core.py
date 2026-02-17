import datetime
from typing import Union, AsyncGenerator

from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.azure import AzureProvider
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from models.llm import LLMProvider, AzureConfig, CreateSummaryRequest
from service.misc.core import MiscService

helper = MiscService()


class LLMService:
    def _create_model(self, provider: LLMProvider, model_name: str, api_key: str,
                      azure_config: AzureConfig | None = None):
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
            azure_config=request.azure_config
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

    async def _stream_response(self, agent: Agent, user_prompt: str) -> AsyncGenerator[str, None]:
        """Stream response chunks from the LLM agent."""
        async with agent.run_stream(user_prompt) as stream:
            async for chunk in stream.stream_text(delta=True):
                yield chunk
