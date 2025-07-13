from fastapi import APIRouter, UploadFile, File
import os
import shutil
from fastapi.responses import JSONResponse
from config import config
from models.config import ConfigResponse

misc_router = APIRouter()

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "../../audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


@misc_router.post("/uploadTempFile")
async def upload_temp_file(file: UploadFile = File(...)):
    os.makedirs(AUDIO_DIR, exist_ok=True)
    file_location = os.path.join(AUDIO_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    rel_path = f"./audio/{file.filename}"
    return JSONResponse(content={"file_path": rel_path})


@misc_router.get("/getConfig", response_model=ConfigResponse, status_code=200)
def get_config():
    return ConfigResponse(system_prompt=config.openai_api_system_prompt)
