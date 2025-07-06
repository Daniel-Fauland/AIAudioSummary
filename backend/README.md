# Backend Breakdown

### Directory Structure

```
backend/
├── api/           # FastAPI routers for different API domains (assemblyai, openai, misc)
│   ├── assemblyai/
│   │   └── router.py
│   ├── openai/
│   │   └── router.py
│   └── misc/
│       └── router.py
├── models/        # Pydantic models for request/response validation and config
│   ├── assemblyai.py
│   ├── openai.py
│   └── config.py
├── service/       # Core business logic for AssemblyAI and OpenAI integration
│   ├── assembly_ai/
│   │   └── core.py
│   └── openai/
│       └── core.py
├── utils/         # Utility modules (helper functions, logging)
│   ├── helper.py
│   └── logging.py
├── config.py      # Centralized configuration using Pydantic
├── main.py        # FastAPI app entry point, router registration, CORS, etc.
├── prompt_template_openai.md # Default system prompt for OpenAI summarization
└── ...
```

### Component Interaction

- **main.py**: Initializes the FastAPI app, sets up CORS, and includes all routers from the `api/` directory.
- **api/**: Contains routers for each API domain:
  - `assemblyai/router.py`: Endpoints for audio transcription.
  - `openai/router.py`: Endpoints for text summarization (supports streaming).
  - `misc/router.py`: Miscellaneous endpoints (e.g., `/getConfig`).
- **models/**: Defines Pydantic models for request/response validation and config schemas. All API endpoints use these models for type safety and documentation.
- **service/**: Implements the core logic for interacting with external APIs (AssemblyAI, OpenAI). Routers call these service functions to perform actual work.
- **utils/**: Helper functions and logging utilities used throughout the backend.
- **config.py**: Loads and validates environment variables and settings using Pydantic. Exposes a `config` object used by the rest of the backend.
- **prompt_template_openai.md**: Stores the default system prompt for OpenAI summarization, loaded by `config.py`.

### API Documentation

- The backend provides detailed, interactive API documentation via **Swagger** at [http://localhost:8080/docs](http://localhost:8080/docs). This includes all endpoints, request/response models, and example payloads.
