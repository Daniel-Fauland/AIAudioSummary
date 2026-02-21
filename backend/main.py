import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import config
from utils.logging import logger
from api.assemblyai.router import assembly_ai_router
from api.llm.router import llm_router
from api.misc.router import misc_router
from api.realtime.router import realtime_router
from api.prompt_assistant.router import prompt_assistant_router

app = FastAPI()

# Add CORS middleware
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assembly_ai_router, tags=["AssemblyAI"])
app.include_router(llm_router, tags=["LLM"])
app.include_router(misc_router, tags=["Misc"])
app.include_router(realtime_router, tags=["Realtime"])
app.include_router(prompt_assistant_router, tags=["PromptAssistant"])


@app.get("/")
def read_root():
    return {
        "Message": config.fastapi_welcome_msg
    }


if __name__ == "__main__":
    logger.debug("Config loaded successfully")
    environment = os.environ.get("ENVIRONMENT", "development")
    uvicorn.run("main:app", host="0.0.0.0", port=8080,
                log_level="info", reload=(environment == "development"))
