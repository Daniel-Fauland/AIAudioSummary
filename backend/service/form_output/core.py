from typing import Optional

from pydantic import BaseModel, Field as PydanticField, create_model
from pydantic_ai import Agent


from models.form_output import (
    FillFormRequest,
    FillFormResponse,
    FormFieldDefinition,
    FormFieldType,
    GenerateTemplateRequest,
    GenerateTemplateResponse,
    GeneratedField,
)
from service.llm.core import LLMService
from utils.logging import logger

_llm_service = LLMService()

_FORM_FILL_SYSTEM_PROMPT = """You are extracting structured data from a meeting transcript to fill a form.

RULES:
- Only fill a field when the information is EXPLICITLY and CLEARLY stated in the transcript.
- If a field's value is not clearly present in the transcript, leave it as null.
- When in doubt, leave the field as null. It is better to leave a field empty than to guess or hallucinate.
- For date fields, use YYYY-MM-DD format.
- For enum fields, the value MUST be exactly one of the defined options. If none match, leave null.
- For multi_select fields, each value MUST be from the defined options. Only include options that are clearly supported by the transcript.
- For list_str fields, extract a list of relevant string items from the transcript.
- For boolean fields, only set true/false when the transcript clearly indicates yes/no for that topic.
- For number fields, extract numeric values only when explicitly stated.
- Be precise and concise in extracted values. Do not add information not present in the transcript.
- For text fields (string, list_str), respond in the same language as the field labels and descriptions. Use proper Unicode characters (e.g., ü, ä, ö, ß for German) — never use ASCII substitutions like ue, ae, oe, ss."""

_INCREMENTAL_SYSTEM_PROMPT_ADDITION = """
INCREMENTAL UPDATE RULES:
- You are receiving previously filled values. Preserve all existing non-null values unless the transcript clearly contradicts them.
- Only update fields where the transcript provides new or corrected information.
- Previously filled values marked as manually edited by the user should always be preserved as-is."""


def _build_field_description(field: FormFieldDefinition) -> str:
    """Build a descriptive string for a form field to guide the LLM."""
    parts = [field.label]
    if field.description:
        parts.append(field.description)
    if field.type == FormFieldType.DATE:
        parts.append("Format: YYYY-MM-DD")
    if field.type == FormFieldType.ENUM and field.options:
        parts.append(f"Must be one of: {', '.join(field.options)}")
    if field.type == FormFieldType.MULTI_SELECT and field.options:
        parts.append(f"Select from: {', '.join(field.options)}")
    return " — ".join(parts)


def _build_dynamic_model(fields: list[FormFieldDefinition]):
    """Create a Pydantic model dynamically from form field definitions."""
    type_map: dict[FormFieldType, type] = {
        FormFieldType.STRING: Optional[str],
        FormFieldType.NUMBER: Optional[float],
        FormFieldType.DATE: Optional[str],
        FormFieldType.BOOLEAN: Optional[bool],
        FormFieldType.LIST_STR: Optional[list[str]],
        FormFieldType.ENUM: Optional[str],
        FormFieldType.MULTI_SELECT: Optional[list[str]],
    }

    field_definitions = {}
    for field in fields:
        python_type = type_map[field.type]
        description = _build_field_description(field)
        field_definitions[field.id] = (python_type, PydanticField(None, description=description))

    return create_model("FormOutput", **field_definitions)


_GENERATE_TEMPLATE_SYSTEM_PROMPT = """You are an expert form designer. Given a user's natural language description, design a form template with appropriate fields.

RULES:
- Choose a concise, descriptive template name that reflects the form's purpose.
- Design fields that best capture the information described by the user.
- Use appropriate field types:
  - "string" for free-text (names, descriptions, notes)
  - "number" for numeric values (counts, scores, amounts)
  - "date" for dates (YYYY-MM-DD format)
  - "boolean" for yes/no questions
  - "list_str" for lists of items (action items, attendees, topics)
  - "enum" for single-choice from predefined options (provide options list)
  - "multi_select" for multiple-choice from predefined options (provide options list)
- For enum and multi_select fields, always provide a reasonable set of options.
- Add a brief description to each field to guide the LLM during form filling.
- Order fields logically (most important first, related fields grouped together).
- Keep the number of fields reasonable (typically 4-10 fields).
- Do not create redundant or overlapping fields."""


class _GenerateTemplateOutput(BaseModel):
    name: str = PydanticField(..., description="Suggested template name")
    fields: list[GeneratedField] = PydanticField(..., description="Generated field definitions")


class FormOutputService:
    async def fill_form(self, request: FillFormRequest) -> FillFormResponse:
        model = _llm_service._create_model(
            provider=request.provider,
            model_name=request.model,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        DynamicModel = _build_dynamic_model(request.fields)

        system_prompt = _FORM_FILL_SYSTEM_PROMPT
        if request.previous_values:
            system_prompt += _INCREMENTAL_SYSTEM_PROMPT_ADDITION

        agent: Agent[None, object] = Agent(
            model=model,
            output_type=DynamicModel,
            model_settings=LLMService.build_model_settings(request.provider, request.model, temperature=0.1),
            system_prompt=system_prompt,
        )

        # Build user prompt
        fields_text = "\n".join(
            f'- {field.id}: {_build_field_description(field)}'
            for field in request.fields
        )

        user_prompt = f"""Extract values for the following form fields from the transcript below.

FORM FIELDS:
{fields_text}"""

        if request.meeting_date:
            user_prompt += f"\n\nCONTEXT:\n- The meeting took place on {request.meeting_date}. Use this date for any date-related fields if the transcript does not explicitly mention a different date."

        if request.previous_values:
            prev_text = "\n".join(
                f"- {k}: {v}" for k, v in request.previous_values.items() if v is not None
            )
            if prev_text:
                user_prompt += f"\n\nPREVIOUSLY FILLED VALUES (preserve unless contradicted):\n{prev_text}"

        user_prompt += f"\n\nTRANSCRIPT:\n{request.transcript}"

        logger.info(f"Filling form with {len(request.fields)} field(s) using {request.provider}/{request.model}")

        result = await agent.run(user_prompt)
        values = result.output.model_dump()

        return FillFormResponse(values=values)

    async def generate_template(self, request: GenerateTemplateRequest) -> GenerateTemplateResponse:
        model = _llm_service._create_model(
            provider=request.provider,
            model_name=request.model,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        agent: Agent[None, _GenerateTemplateOutput] = Agent(
            model=model,
            output_type=_GenerateTemplateOutput,
            model_settings=LLMService.build_model_settings(request.provider, request.model, temperature=0.3),
            system_prompt=_GENERATE_TEMPLATE_SYSTEM_PROMPT,
        )

        user_prompt = f"Design a form template for the following use case:\n\n{request.description}"

        logger.info(f"Generating form template using {request.provider}/{request.model}")

        result = await agent.run(user_prompt)
        output = result.output

        return GenerateTemplateResponse(name=output.name, fields=output.fields)
