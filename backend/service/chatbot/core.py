import json
from pathlib import Path
from typing import Union, AsyncGenerator

from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

from models.chatbot import ChatRequest, ChatMessage
from models.llm import LLMProvider
from service.llm.core import LLMService
from service.chatbot.actions import ACTION_REGISTRY
from utils.logging import logger


class ChatbotService:
    _knowledge_base: str | None = None
    _knowledge_base_path = Path(__file__).parent.parent.parent / "usage_guide" / "usage_guide.md"

    def _load_knowledge_base(self) -> str:
        """Load and cache the usage guide knowledge base."""
        if self._knowledge_base is None:
            try:
                self._knowledge_base = self._knowledge_base_path.read_text(encoding="utf-8")
                logger.info(f"Loaded knowledge base ({len(self._knowledge_base)} chars)")
            except FileNotFoundError:
                logger.warning(f"Knowledge base not found at {self._knowledge_base_path}")
                self._knowledge_base = ""
        return self._knowledge_base

    def _build_system_prompt(self, request: ChatRequest) -> str:
        """Assemble the system prompt based on enabled capabilities."""
        parts = [
            "You are a helpful assistant for the AI Audio Summary application. "
            "You help users understand and use the app effectively. "
            "Be concise, friendly, and accurate in your responses."
        ]

        # Include current user settings context
        if request.app_context:
            ctx = request.app_context
            context_lines = []
            if ctx.selected_provider:
                context_lines.append(f"- Current LLM provider: {ctx.selected_provider}")
            if ctx.selected_model:
                context_lines.append(f"- Current LLM model: {ctx.selected_model}")
            if ctx.app_mode:
                context_lines.append(f"- Current app mode: {ctx.app_mode}")
            if ctx.theme:
                context_lines.append(f"- Current theme: {ctx.theme}")
            if ctx.app_version:
                context_lines.append(f"- App version: {ctx.app_version}")
            if context_lines:
                parts.append(
                    "\n\n## Current User Settings\n"
                    "The user's current configuration:\n" +
                    "\n".join(context_lines)
                )
            if ctx.changelog:
                parts.append(
                    "\n\n## Version History & Changelog\n"
                    "When the user asks about the current version, new features, or what's changed, "
                    "use this changelog to answer:\n\n" +
                    ctx.changelog
                )

        if request.qa_enabled:
            knowledge = self._load_knowledge_base()
            if knowledge:
                parts.append(
                    "\n\n## Application Knowledge Base\n"
                    "Use the following documentation to answer questions about the application. "
                    "If the user asks something not covered here, say so honestly.\n\n"
                    f"{knowledge}"
                )

        if request.transcript_enabled and request.transcript:
            parts.append(
                "\n\n## Current Transcript\n"
                "The user has an active transcript in their session. "
                "You can reference it to answer questions about the meeting content. "
                "If the user asks about the transcript or meeting, use this context. "
                "Let the user know you have access to their transcript only if they ask about it "
                "or if it's relevant to their question.\n\n"
                f"{request.transcript}"
            )

        if request.actions_enabled:
            actions_json = json.dumps(ACTION_REGISTRY, indent=2)
            parts.append(
                "\n\n## Available Actions\n"
                "You can propose actions that modify the app's settings or UI. "
                "When the user asks you to change a setting or perform an action that matches one of the "
                "available actions below, respond with your message AND include an action block.\n\n"
                "Format the action block as a fenced code block with the language tag `action`:\n"
                "```action\n"
                '{"action_id": "<id>", "description": "<what it does>", "params": {<params>}}\n'
                "```\n\n"
                "Only propose ONE action per response. Only propose actions from this registry:\n\n"
                f"{actions_json}\n\n"
                "IMPORTANT CONSTRAINTS:\n"
                "- Storage mode (local/account) CANNOT be changed via actions. If the user asks to switch storage mode, "
                "explain that they need to use the avatar menu → Storage Mode dialog.\n"
                "- For change_model, ONLY propose models that are listed in 'valid_models_per_provider' for the user's current provider. "
                "Do NOT invent or guess model names.\n"
                "- For change_provider, ONLY use providers from the enum list. "
                "Azure OpenAI has no predefined models (it uses a deployment name configured in settings).\n"
                "- Do NOT confuse 'switch_app_mode' (standard/realtime transcription mode) with storage mode (local/account).\n"
                "- For save_prompt_template: write a complete, production-ready prompt. Use {language} as placeholder for the target language. Do NOT include field IDs — only name and content.\n"
                "- For save_form_template: choose appropriate field types. For enum/multi_select fields, always include an options array. Do NOT include field IDs — only label, type, description, and options."
            )

        if request.confirmed_action:
            parts.append(
                f"\n\n## Action Confirmed\n"
                f"The user has confirmed the action: {request.confirmed_action.action_id} "
                f"({request.confirmed_action.description}). "
                f"Acknowledge that the action has been applied successfully and briefly confirm what changed."
            )

        return "\n".join(parts)

    def _build_messages(self, messages: list[ChatMessage]) -> list[ChatMessage]:
        """Convert and trim messages, keeping the last 20."""
        return messages[-20:]

    async def chat(self, request: ChatRequest) -> Union[str, AsyncGenerator[str, None]]:
        """Main chat method. Returns a string or async generator depending on stream flag."""
        llm_service = LLMService()

        model_name = request.model
        if request.provider == LLMProvider.AZURE_OPENAI and request.azure_config:
            model_name = request.azure_config.deployment_name

        model = llm_service._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config
        )

        system_prompt = self._build_system_prompt(request)
        trimmed_messages = self._build_messages(request.messages)

        # Build user prompt: include conversation history if more than 1 message
        if len(trimmed_messages) > 1:
            history_lines = []
            for msg in trimmed_messages[:-1]:
                role_label = "User" if msg.role == "user" else "Assistant"
                history_lines.append(f"{role_label}: {msg.content}")
            history_text = "\n".join(history_lines)
            user_prompt = (
                f"Previous conversation:\n{history_text}\n\n"
                f"User: {trimmed_messages[-1].content}"
            )
        else:
            user_prompt = trimmed_messages[-1].content

        agent = Agent(
            model,
            system_prompt=system_prompt,
            model_settings=ModelSettings(temperature=0.7)
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

    def get_knowledge_status(self) -> dict:
        """Return the loaded status and length of the knowledge base."""
        knowledge = self._load_knowledge_base()
        return {
            "loaded": bool(knowledge),
            "length": len(knowledge) if knowledge else 0,
            "path": str(self._knowledge_base_path)
        }
