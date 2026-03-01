from pydantic_ai import Agent


from models.live_questions import (
    EvaluateQuestionsRequest,
    EvaluateQuestionsResponse,
    QuestionEvaluation,
)
from service.llm.core import LLMService
from utils.logging import logger

_llm_service = LLMService()

_EVALUATE_SYSTEM_PROMPT = """You are evaluating whether specific questions or topics can be answered based on a meeting transcript.

RULES:
- Only mark a question as "answered" if the transcript contains a CLEAR, CONCRETE, and COMPLETE answer to the specific question asked.
- If the transcript mentions the topic but does not fully answer the specific question, do NOT mark it as answered.
- When in doubt, leave the question as unanswered. It is better to wait for more transcript than to give a wrong or incomplete answer.
- Answers must be SHORT (one sentence max) and cite the specific information from the transcript.
- Always answer in the same language as the question. Use proper Unicode characters (e.g., ü, ä, ö, ß for German) — never use ASCII substitutions like ue, ae, oe, ss.
- For yes/no or topic-check questions (e.g., "Was X discussed?"), mark as answered if the topic appears in the transcript, and provide a brief summary of what was said.
- For specific detail questions (e.g., "What date was decided?"), only mark as answered if the exact detail is present in the transcript.
- If a question has no id in the transcript, set answered to false and omit the answer field entirely.

EXAMPLES:
- Question: "Team event discussed?" + Transcript mentions team offsite → answered: true, answer: "Yes — team offsite for Q3 was discussed"
- Question: "Team event scheduled for which date?" + Transcript mentions team event but no date → answered: false
- Question: "Who is leading Project X?" + Transcript says "Sarah will take over Project X" → answered: true, answer: "Sarah"

You must return an evaluation for EVERY question provided. The evaluations list must have exactly one entry per question id."""


class LiveQuestionsService:
    async def evaluate(self, request: EvaluateQuestionsRequest) -> EvaluateQuestionsResponse:
        model = _llm_service._create_model(
            provider=request.provider,
            model_name=request.model,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        agent: Agent[None, EvaluateQuestionsResponse] = Agent(
            model=model,
            output_type=EvaluateQuestionsResponse,
            model_settings=LLMService.build_model_settings(request.provider, request.model, temperature=0.1),
            system_prompt=_EVALUATE_SYSTEM_PROMPT,
        )

        questions_text = "\n".join(
            f'- ID: {q.id} | Question: "{q.question}"'
            for q in request.questions
        )

        user_prompt = f"""Evaluate the following questions against the transcript below.

QUESTIONS TO EVALUATE:
{questions_text}

TRANSCRIPT:
{request.transcript}"""

        logger.info(f"Evaluating {len(request.questions)} live question(s) with {request.provider}/{request.model}")

        result = await agent.run(user_prompt)
        response = result.output

        # Ensure every question has an evaluation entry (guard against LLM omissions)
        evaluated_ids = {e.id for e in response.evaluations}
        for q in request.questions:
            if q.id not in evaluated_ids:
                response.evaluations.append(QuestionEvaluation(id=q.id, answered=False))

        return response
