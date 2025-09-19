import datetime
from openai import OpenAI, AzureOpenAI
from typing import Union, AsyncGenerator
from service.misc.core import MiscService
from config import config
from utils.logging import logger

helper = MiscService()

class OpenAIService:
    def __init__(self):
        self.client = self._create_client()

    def _create_client(self):
        """Create the appropriate OpenAI client based on configuration."""
        if config.openai_api_type == "azure":
            return AzureOpenAI(
                api_key=config.api_key_openai,
                api_version=config.openai_api_version,
                azure_endpoint=config.openai_api_base
            )

    async def build_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        target_language: str,
        informal_german: bool = True,
        date: datetime.date = None
    ):
        """
        Build the system and user prompts for the LLM, optimizing for clarity and conciseness.
        """
        date = date or datetime.date.today()
        day_of_the_week = await helper.get_day_of_week(date, country_code="DE")
        target_language_lower = target_language.lower()

        # Compose language/tone instructions only if needed
        if target_language_lower == "german":
            tone = (
                "Use informal German 'du' & 'ihr' instead of 'sie'."
                if informal_german
                else "Use formal German 'sie' instead of 'du' or 'ihr'."
            )
            system_prompt = f"{system_prompt}\nYour Summary must be in German. {tone}"
        else:
            system_prompt = f"{system_prompt}\nYour Summary must be in {target_language}"

        user_prompt = (
            f"Please summarize the following transcription:\n\n"
            f"Recording Date: {day_of_the_week} - {date}\n{user_prompt}"
        )
        return system_prompt, user_prompt

    async def generate_summary(self, text: str, system_prompt: str, target_language: str, informal_german: bool, openai_key: str, date: datetime.date = None, stream: bool = False) -> Union[str, AsyncGenerator[str, None]]:
        """Generate a summary using either OpenAI or Azure OpenAI.

        Args:
            text: The text to summarize
            stream: If True, returns an async generator for streaming. If False, returns the complete response as string.

        Returns:
            Either a string (complete response) or an async generator (streaming chunks)
        """
        system_prompt, user_prompt = await self.build_prompt(system_prompt=system_prompt, user_prompt=text, target_language=target_language, informal_german=informal_german, date=date)
        try:
            if config.openai_api_type == "azure":
                # Azure OpenAI
                response = self.client.chat.completions.create(
                    model=config.api_deployment_name_azure_openai,  # Use deployment name for Azure
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.5,
                    stream=stream
                )
            else:
                # OpenAI
                if not openai_key:
                    logger.error("No OpenAI Key provided")
                    raise RuntimeError()
                self.client = OpenAI(api_key=openai_key)
                response = self.client.chat.completions.create(
                    model=config.openai_api_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.5,
                    stream=stream
                )

            if stream:
                return self._stream_response(response)
            else:
                return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise RuntimeError()

    async def _stream_response(self, response) -> AsyncGenerator[str, None]:
        """Helper method to handle streaming responses. Wraps sync generator as async."""
        def sync_iter():
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        for chunk in sync_iter():
            yield chunk
