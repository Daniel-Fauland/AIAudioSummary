from pydantic import BaseModel, Field

from models.llm import AzureConfig, LangdockConfig, LLMProvider


class QuestionInput(BaseModel):
    id: str = Field(..., description="Question UUID")
    question: str = Field(..., min_length=1, description="The question or topic text")


class EvaluateQuestionsRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig | None = Field(None, description="Langdock region config")
    transcript: str = Field(..., min_length=1, description="Full transcript text to evaluate against")
    questions: list[QuestionInput] = Field(..., description="Unanswered questions to evaluate")


class QuestionEvaluation(BaseModel):
    id: str = Field(..., description="Question ID")
    answered: bool = Field(..., description="Whether the question is answered by the transcript")
    answer: str | None = Field(None, description="Short answer text (only when answered is True)")


class EvaluateQuestionsResponse(BaseModel):
    evaluations: list[QuestionEvaluation] = Field(..., description="Evaluation results for each question")
