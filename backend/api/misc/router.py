from fastapi import APIRouter
from config import config
from models.config import ConfigResponse

misc_router = APIRouter()


@misc_router.get("/getConfig", response_model=ConfigResponse, status_code=200)
def get_config():
    return ConfigResponse(system_prompt=config.openai_api_system_prompt)
