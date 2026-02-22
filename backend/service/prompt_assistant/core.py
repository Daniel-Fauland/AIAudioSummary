from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

from models.prompt_assistant import (
    AnalyzeRequest,
    AnalyzeResponse,
    AssistantQuestion,
    GenerateRequest,
    GenerateResponse,
    QuestionType,
)
from service.llm.core import LLMService
from utils.logging import logger

_llm_service = LLMService()

# Injected programmatically — always the first question, never delegated to the LLM.
_TARGET_SYSTEM_QUESTION = AssistantQuestion(
    id="target_system",
    question="What is the target system for this summary?",
    type=QuestionType.SINGLE_SELECT,
    options=[
        "Email",
        "Chat message (e.g. Teams, Slack)",
        "Wiki article (e.g. Confluence, Notion)",
        "User story (e.g. Jira, Linear)",
        "Personal notes",
    ],
    default=None,
    inferred=False,
)

_ANALYZE_SYSTEM_PROMPT = """You are a helpful assistant that analyzes meeting summary prompt templates and identifies gaps.

Your task: given an optional base prompt, return 3-5 structured questions that help the user configure a complete system prompt for AI-powered meeting summaries.

Question guidelines:
- Cover the most impactful aspects: output format/structure, tone/style, target audience, sections to include, and special rules
- Use 'single_select' for mutually exclusive choices (e.g., summary length/format, tone)
- Use 'multi_select' for features that can be combined (e.g., sections to include)
- Use 'free_text' for open-ended custom rules or special instructions
- Always provide sensible 'default' values based on common use cases
- Use short, descriptive IDs: output_format, tone, audience, sections, custom_rules
- If an answer can be derived from the base prompt, set inferred=true and explain in inferred_reason

STRICT EXCLUSIONS — never ask about these, they are handled elsewhere in the app:
- Markdown flavor or formatting style: always assume GitHub-Flavored Markdown (GFM) — never ask
- Target language or output language: the user sets this separately in the app — never ask
- Target system or output destination (e.g. email, chat, wiki): this is asked separately — never ask
- When generating section options for 'multi_select' questions, never include "Links & references" as an option — links from chats are not part of meeting transcripts and cannot be reliably extracted

When a base prompt is provided, also populate 'suggested_target_system' with the most likely output destination if you can confidently infer it from the prompt's style, tone, or explicit mentions (e.g. "write an email", "post to Confluence", subject/greeting patterns imply Email, bullet-heavy casual style implies Chat). Leave as null if you are not confident.

Focus on what matters most: structure, tone, audience, sections to include, and domain-specific rules.
Keep questions concise and practical."""

_GENERATE_SYSTEM_PROMPT = """You are an expert prompt engineer specializing in AI meeting summary assistants.

Generate a complete, professional, immediately usable system prompt for an AI that summarizes meeting transcripts.

Requirements:
- Incorporate ALL user preferences from their answers
- Preserve strong elements from the base prompt if one was provided
- Include concrete instructions for: format, tone, required sections, language style, and special rules
- Use direct imperative language ("Summarize...", "Include...", "Use...", "Always...")
- Make the prompt self-contained — it should work without additional context
- Output ONLY the system prompt text — no preamble, no meta-commentary, no explanations

IMPORTANT — Target system tailoring (from the "target_system" answer):
Adapt the generated prompt's output instructions to the selected target system:
- "Email": instruct the AI to include a subject line, greeting, and sign-off; professional tone; concise paragraphs
- "Chat message (e.g. Teams, Slack)": shorter and more direct; no greeting or sign-off; bullet points preferred; casual-professional tone
- "Wiki article (e.g. Confluence, Notion)": more structured with headings and context; write for readers who were NOT in the meeting; include background and decisions clearly
- "User story (e.g. Jira, Linear)": format relevant items as acceptance criteria or user story descriptions; focus on actionable outcomes and decisions
- "Personal notes": informal style; abbreviations and shorthand are fine; no ceremony; optimize for quick personal recall
- Any custom value: tailor the output format and style to fit that system as best as possible

The output must be a ready-to-use system prompt string."""


class PromptAssistantService:
    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """Analyze an optional base prompt and return structured questions to refine it."""
        model_name = request.model
        if request.azure_config:
            model_name = request.azure_config.deployment_name

        model = _llm_service._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        if request.base_prompt and request.base_prompt.strip():
            user_prompt = (
                f"Analyze this base prompt and identify what it covers and what's missing:\n\n"
                f"```\n{request.base_prompt.strip()}\n```\n\n"
                f"Return 3-5 targeted questions to help complete or refine it."
            )
        else:
            user_prompt = (
                "No base prompt provided. Generate 3-5 questions from scratch to help the user "
                "create a complete system prompt for meeting summary generation."
            )

        agent = Agent(
            model,
            system_prompt=_ANALYZE_SYSTEM_PROMPT,
            output_type=AnalyzeResponse,
            model_settings=ModelSettings(temperature=0.3),
        )

        result = await agent.run(user_prompt)
        response = result.output

        # Build the target system question with an appropriate default:
        # - Base prompt provided + LLM inferred a target → use it, mark as inferred
        # - Base prompt provided + LLM couldn't infer → no default
        # - No base prompt (skipped) → default to "Email"
        if request.base_prompt and request.base_prompt.strip():
            if response.suggested_target_system:
                target_q = _TARGET_SYSTEM_QUESTION.model_copy(update={
                    "default": response.suggested_target_system,
                    "inferred": True,
                    "inferred_reason": "Inferred from your existing prompt's style and context.",
                })
            else:
                target_q = _TARGET_SYSTEM_QUESTION
        else:
            target_q = _TARGET_SYSTEM_QUESTION.model_copy(update={"default": "Email"})

        response.questions.insert(0, target_q)
        return response

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        """Generate a final system prompt based on user preferences and answers."""
        model_name = request.model
        if request.azure_config:
            model_name = request.azure_config.deployment_name

        model = _llm_service._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        answers_text = "\n".join(
            f"- {question_id}: {value if isinstance(value, str) else ', '.join(value)}"
            for question_id, value in request.answers.items()
        )

        user_prompt_parts = []
        if request.base_prompt and request.base_prompt.strip():
            user_prompt_parts.append(f"Base prompt to build upon:\n```\n{request.base_prompt.strip()}\n```")

        user_prompt_parts.append(f"User preferences:\n{answers_text}")

        if request.additional_notes and request.additional_notes.strip():
            user_prompt_parts.append(f"Additional requirements:\n{request.additional_notes.strip()}")

        user_prompt_parts.append(
            "Generate a complete, ready-to-use system prompt for meeting summary generation."
        )

        user_prompt = "\n\n".join(user_prompt_parts)

        agent = Agent(
            model,
            system_prompt=_GENERATE_SYSTEM_PROMPT,
            model_settings=ModelSettings(temperature=0.4),
        )

        result = await agent.run(user_prompt)
        return GenerateResponse(generated_prompt=result.output)
