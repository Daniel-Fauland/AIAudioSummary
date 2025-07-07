# AIAudioSummary

**Chapters**:

- [Introduction](#introduction)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Install and run backend](#install-and-run-backend)
  - [Install and run frontend](#install-and-run-frontend)

## Introduction

AIAudioSummary is a web application that enables users to upload audio files (such as meeting recordings) and automatically generate high-quality transcripts and AI-powered summaries. The app leverages state-of-the-art speech-to-text and language models to help users quickly extract key information from spoken content.

**How it works:**

- Users upload an audio file via the web interface.
- The backend transcribes the audio using AssemblyAI's speech-to-text API.
- The transcript is then summarized using OpenAI's GPT models, with a customizable system prompt.
- Both the transcript and summary are displayed side-by-side in the frontend, and are fully editable by the user.
- The summary is streamed live to the frontend for a responsive experience.

**Tech stack:**

- **Frontend:** Streamlit (Python)
- **Backend:** FastAPI (Python)
- **Speech-to-text:** AssemblyAI API
- **Summarization:** OpenAI (or Azure OpenAI)
- **Package management:** [uv](https://github.com/astral-sh/uv)

More information about the backend can be found in [backend/README.md](./backend/README.md)

## Installation

### Prerequisites

1. Make sure you have an API key for [AssemblyAI](https://www.assemblyai.com/) and (Azure) [OpenAI](https://openai.com/api/).

2. Go to `/backend` folder and create a `.env` file from the `.env.example` file.
   ```
   cp .env.example .env
   ```
3. Insert your API keys in `.env`

---

The python backend uses [uv](https://github.com/astral-sh/uv) as a package manager instead of pyenv / conda or sth similar.

To install `uv` follow these steps:

- **MacOS / Linux**:

  ```
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

- **Windows**:
  ```
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```

### Install and run backend

1. Open terminal and go to the `/backend` folder:

   ```
   cd backend
   ```

2. Start the backend (This will automatically install pyhton and all dependencies when run for the first time):

   ```
   uv run main.py
   ```

   The backend will be available under this address: [http://localhost:8080/](http://localhost:8080/)

   Swagger Docs are avaible here: [http://localhost:8080/docs](http://localhost:8080/docs)

### Install and run frontend

1. Open terminal and go to the `/frontend` folder:

   ```
   cd frontend
   ```

2. Start the frontend (This will automatically install pyhton and all dependencies when run for the first time):
   ```
   uv run main.py
   ```
