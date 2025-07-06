import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import config, Settings
from utils.logging import logger
from api.assemblyai.router import assembly_ai_router
from api.openai.router import openai_router
from api.misc.router import misc_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assembly_ai_router, tags=["AssemblyAI"])
app.include_router(openai_router, tags=["OpenAI"])
app.include_router(misc_router, tags=["Misc"])


@app.get("/")
def read_root():
    return {
        "Message": config.fastapi_welcome_msg
    }


if __name__ == "__main__":
    logger.debug(
        f"Successfully read the config: {list(Settings.model_fields.keys())}")
    uvicorn.run("main:app", host="0.0.0.0", port=8080,
                log_level="info", reload=True)
