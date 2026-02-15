import os
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException
from service.assembly_ai.core import AssemblyAIService
from models.assemblyai import CreateTranscriptResponse

assembly_ai_router = APIRouter()
service = AssemblyAIService()


@assembly_ai_router.post("/createTranscript", response_model=CreateTranscriptResponse, status_code=200)
async def create_transcript(
    file: UploadFile = File(..., description="The audio file to transcribe"),
    x_assemblyai_key: str = Header(..., description="The AssemblyAI API key"),
    lang_code: str | None = Form(None, description="Language code (e.g., 'en', 'de'). If not provided, language will be automatically detected", example=None),
    min_speaker: int = Form(1, description="Minimum number of speakers expected", ge=1),
    max_speaker: int = Form(10, description="Maximum number of speakers expected", le=20)
):
    """Create a transcript of an uploaded audio file using AssemblyAI.

    The AssemblyAI API key must be provided via the `X-AssemblyAI-Key` header.

    Args:
        file (UploadFile): The uploaded audio file.
        x_assemblyai_key (str): AssemblyAI API key provided via header.
        lang_code (str, optional): Language code. If not provided, language detection will be enabled.
        min_speaker (int): Minimum number of speakers expected (default: 1).
        max_speaker (int): Maximum number of speakers expected (default: 10).
    """
    if not x_assemblyai_key or not x_assemblyai_key.strip():
        raise HTTPException(
            status_code=400,
            detail="AssemblyAI API key is required. Provide it via the X-AssemblyAI-Key header."
        )

    temp_file_path = None
    try:
        # Save uploaded file to temporary location
        temp_file_path = await service.save_uploaded_file_to_temp(file)

        # Get transcript using the temporary file path
        transcript = await service.get_transcript(
            path_to_file=temp_file_path,
            api_key=x_assemblyai_key,
            lang_code=lang_code,
            min_speaker=min_speaker,
            max_speaker=max_speaker
        )

        return CreateTranscriptResponse(transcript=transcript)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")

    finally:
        # Clean up: delete the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                # Log the error but don't raise it since we've already processed the file
                print(f"Warning: Could not delete temporary file {temp_file_path}: {e}")
