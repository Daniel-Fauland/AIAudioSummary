import json
from pathlib import Path
from typing import Union, AsyncGenerator

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, UserPromptPart, TextPart


from models.chatbot import ChatRequest, ChatMessage
from models.llm import LLMProvider
from service.llm.core import LLMService
from service.chatbot.actions import ACTION_REGISTRY
from utils.logging import logger


class ChatbotService:
    _knowledge_base: str | None = None
    _knowledge_base_path = Path(
        __file__).parent.parent.parent / "usage_guide" / "usage_guide.md"

    def _load_knowledge_base(self) -> str:
        """Load and cache the usage guide knowledge base."""
        if self._knowledge_base is None:
            try:
                self._knowledge_base = self._knowledge_base_path.read_text(
                    encoding="utf-8")
                logger.info(
                    f"Loaded knowledge base ({len(self._knowledge_base)} chars)")
            except FileNotFoundError:
                logger.warning(
                    f"Knowledge base not found at {self._knowledge_base_path}")
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
                context_lines.append(
                    f"- Current LLM provider: {ctx.selected_provider}")
            if ctx.selected_model:
                context_lines.append(
                    f"- Current LLM model: {ctx.selected_model}")
            if ctx.app_mode:
                context_lines.append(f"- Current app mode: {ctx.app_mode}")
            if ctx.theme:
                context_lines.append(f"- Current theme: {ctx.theme}")
            if ctx.app_version:
                context_lines.append(f"- App version: {ctx.app_version}")
            if ctx.user_timestamp:
                context_lines.append(
                    f"- User's current local date/time: {ctx.user_timestamp}")
            if ctx.last_visit_timestamp:
                context_lines.append(
                    f"- User's last visit: {ctx.last_visit_timestamp}")
            if ctx.custom_templates:
                tpl_lines = []
                for t in ctx.custom_templates:
                    tpl_lines.append(
                        f"  - ID: `{t.id}` | Name: {t.name}\n    Content: {t.content}")
                context_lines.append(
                    "- Custom prompt templates:\n" + "\n".join(tpl_lines))
            if ctx.form_templates:
                tpl_lines = []
                for t in ctx.form_templates:
                    field_desc = ", ".join(
                        f"{f.label} ({f.type})" +
                        (f" [{', '.join(f.options)}]" if f.options else "")
                        for f in t.fields
                    )
                    tpl_lines.append(
                        f"  - ID: `{t.id}` | Name: {t.name} | Fields: [{field_desc}]")
                context_lines.append(
                    "- Custom form templates:\n" + "\n".join(tpl_lines))
            if context_lines:
                parts.append(
                    "\n\n## Current User Settings\n"
                    "The user's current configuration:\n" +
                    "\n".join(context_lines)
                )
            if ctx.changelog:
                changelog_instructions = (
                    "When the user asks about the current version, new features, or what's changed, "
                    "use this changelog to answer."
                )
                if ctx.last_visit_timestamp:
                    changelog_instructions += (
                        " When the user asks what changed since their last visit, compare the 'last visit' "
                        "timestamp above against the changelog entry dates to determine which changes "
                        "are new. Summarize them in a friendly, concise way (e.g. 'Since your last visit "
                        "2 days ago, 1 new feature was added: …')."
                    )
                parts.append(
                    "\n\n## Version History & Changelog\n" +
                    changelog_instructions + "\n\n" +
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
                "- ALWAYS use the ```action``` code block format above to propose actions. "
                "NEVER write action status text like '[Action applied: ...]' or '[Action cancelled...]' in your responses — "
                "the system handles action execution and status display separately.\n"
                "- If the user's message includes a note like '[The \"...\" action was applied successfully]', "
                "that means the previous action was executed. Briefly acknowledge it but do NOT repeat the status note.\n"
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

        return "\n".join(parts)

    def _build_message_history(self, messages: list[ChatMessage]) -> list[ModelMessage]:
        """Convert ChatMessage list to pydantic-ai ModelMessage objects for proper multi-turn."""
        history: list[ModelMessage] = []
        for msg in messages:
            if msg.role == "user":
                history.append(ModelRequest(
                    parts=[UserPromptPart(content=msg.content)]))
            else:
                history.append(ModelResponse(
                    parts=[TextPart(content=msg.content)]))
        return history

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
        trimmed_messages = request.messages[-20:]

        # Build proper multi-turn message history (all messages except the last)
        message_history: list[ModelMessage] | None = None
        if len(trimmed_messages) > 1:
            message_history = self._build_message_history(
                trimmed_messages[:-1])

        user_prompt = trimmed_messages[-1].content

        # Use 'instructions' instead of 'system_prompt': pydantic-ai always includes
        # instructions on every ModelRequest (even with message_history), and the
        # provider adapters insert them at the beginning of the conversation.
        # This avoids the issue where system_prompt was either skipped (when history
        # exists) or placed after history messages.
        agent = Agent(
            model,
            instructions=system_prompt,
            model_settings=LLMService.build_model_settings(
                request.provider, model_name, temperature=0.7)
        )

        if request.stream:
            return self._stream_response(agent, user_prompt, message_history)
        else:
            result = await agent.run(user_prompt, message_history=message_history)
            return result.output, result.usage()

    async def _stream_response(
        self,
        agent: Agent,
        user_prompt: str,
        message_history: list[ModelMessage] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream response chunks from the LLM agent."""
        import json as _json
        has_yielded = False
        try:
            async with agent.run_stream(user_prompt, message_history=message_history) as stream:
                async for chunk in stream.stream_text(delta=True):
                    has_yielded = True
                    yield chunk
                # After stream completes, yield usage marker
                try:
                    usage = stream.usage()
                    usage_data = _json.dumps({
                        "input_tokens": usage.input_tokens or 0,
                        "output_tokens": usage.output_tokens or 0,
                        "total_tokens": (usage.input_tokens or 0) + (usage.output_tokens or 0),
                    })
                    yield f"\n\n<!--TOKEN_USAGE:{usage_data}-->"
                except Exception:
                    pass
        except RuntimeError as e:
            if "cancel scope" in str(e) and has_yielded:
                # Known pydantic-ai/anyio cleanup issue — safe to ignore since
                # all data was already streamed successfully.
                return
            logger.error(f"Chatbot streaming error: {e}")
            if has_yielded:
                yield f"\n\n<!--STREAM_ERROR:{e}-->"
            else:
                raise
        except Exception as e:
            logger.error(f"Chatbot streaming error: {e}")
            if has_yielded:
                # Mid-stream error: yield marker instead of raising — raising
                # kills the HTTP connection (broken chunked encoding → nginx 502).
                yield f"\n\n<!--STREAM_ERROR:{e}-->"
            else:
                # Initial error (no data sent yet): re-raise so the router
                # can return a proper HTTP error response.
                raise

    def get_knowledge_status(self) -> dict:
        """Return the loaded status and length of the knowledge base."""
        knowledge = self._load_knowledge_base()
        return {
            "loaded": bool(knowledge),
            "length": len(knowledge) if knowledge else 0,
            "path": str(self._knowledge_base_path)
        }
