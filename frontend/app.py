import streamlit as st
import requests
import tempfile
import os
from pathlib import Path
from dotenv import load_dotenv

# --- LOAD ENV ---
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
TRANSCRIPT_ENDPOINT = f"{BACKEND_URL}/createTranscript"
SUMMARY_ENDPOINT = f"{BACKEND_URL}/createSummary"
GET_CONFIG_ENDPOINT = f"{BACKEND_URL}/getConfig"

# --- FETCH CONFIG FROM BACKEND ---


def fetch_config():
    try:
        resp = requests.get(GET_CONFIG_ENDPOINT)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {"system_prompt": ""}


if "config" not in st.session_state:
    st.session_state.config = fetch_config()

st.set_page_config(page_title="AI Audio Summary", layout="wide")
st.title("AI Audio Meeting Summarizer")
st.markdown("""
Upload an audio file, adjust the system prompt if needed, and generate a transcript and summary. The summary is streamed live from OpenAI.
""")

# --- SESSION STATE ---
if "transcript" not in st.session_state:
    st.session_state.transcript = ""
if "summary" not in st.session_state:
    st.session_state.summary = ""
if "system_prompt" not in st.session_state:
    st.session_state.system_prompt = st.session_state.config.get(
        "system_prompt", "")
if "processing" not in st.session_state:
    st.session_state.processing = False

# --- FILE UPLOAD ---
uploaded_file = st.file_uploader("Upload your audio file", type=[
                                 "mp3", "wav", "m4a", "ogg", "flac"], help="Supported formats: mp3, wav, m4a, ogg, flac")

# --- SYSTEM PROMPT ---
st.markdown("**System Prompt:**")
st.session_state.system_prompt = st.text_area(
    "System Prompt",
    value=st.session_state.system_prompt,
    height=220,
    key="system_prompt_area"
)

# --- PROCESS BUTTON ---


def process_audio():
    st.session_state.processing = True
    st.session_state.transcript = ""
    st.session_state.summary = ""
    temp_dir = tempfile.mkdtemp(dir=Path(__file__).parent)
    temp_path = os.path.join(temp_dir, uploaded_file.name)
    # Save uploaded file
    with open(temp_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    try:
        # 1. Call backend for transcript
        params = {"file_path": temp_path}
        resp = requests.get(TRANSCRIPT_ENDPOINT, params=params)
        resp.raise_for_status()
        transcript = resp.json().get("transcript", "")
        st.session_state.transcript = transcript
        # 2. Call backend for summary (streamed)
        data = {
            "text": transcript,
            "system_prompt": st.session_state.system_prompt,
            "stream": True
        }
        summary = ""
        col1, col2 = st.columns(2)
        st.session_state["streaming_col1"] = col1
        st.session_state["streaming_col2"] = col2
        with col1:
            if st.session_state.transcript:
                transcript_box = st.empty()
                transcript_box.text_area(
                    "Transcript",
                    value=st.session_state.transcript,
                    height=400,
                    key="transcript_area_streaming",
                    disabled=True
                )
                st.session_state["streaming_transcript_box"] = transcript_box
        with col2:
            summary_box = st.empty()
            st.session_state["streaming_summary_box"] = summary_box
            with requests.post(SUMMARY_ENDPOINT, json=data, stream=True) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=128):
                    if chunk:
                        summary += chunk.decode("utf-8")
                        summary_box.text_area(
                            "Summary (streaming...)",
                            value=summary,
                            height=400
                        )
        st.session_state.summary = summary
    finally:
        # Clean up temp file and dir
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
    st.session_state.processing = False


process_btn = st.button(
    "Start Processing",
    type="primary",
    disabled=not uploaded_file or st.session_state.processing,
    help="Transcribe and summarize the uploaded audio file."
)
if process_btn and uploaded_file:
    st.session_state.processing = True
    with st.spinner("Processing, please wait..."):
        process_audio()
    st.session_state.processing = False

# --- DISPLAY COLUMNS (if already processed) ---
if st.session_state.transcript or st.session_state.summary:
    # Clear previous streaming placeholders if they exist
    if st.session_state.get("streaming_summary_box") is not None:
        st.session_state["streaming_summary_box"].empty()
        st.session_state["streaming_summary_box"] = None
    if st.session_state.get("streaming_transcript_box") is not None:
        st.session_state["streaming_transcript_box"].empty()
        st.session_state["streaming_transcript_box"] = None
    if st.session_state.get("streaming_col1") is not None:
        st.session_state["streaming_col1"].empty()
        st.session_state["streaming_col1"] = None
    if st.session_state.get("streaming_col2") is not None:
        st.session_state["streaming_col2"].empty()
        st.session_state["streaming_col2"] = None
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.transcript = st.text_area(
            "Transcript",
            value=st.session_state.transcript,
            height=400,
            key="transcript_area_final"
        )
    with col2:
        st.session_state.summary = st.text_area(
            "Summary",
            value=st.session_state.summary,
            height=400,
            key="summary_area_final2"
        )

# --- STYLE ---
st.markdown("""
<style>
    .stTextArea textarea { font-family: 'Fira Mono', monospace; font-size: 1.05em; }
    .stButton>button { font-size: 1.1em; padding: 0.5em 2em; border-radius: 8px; }
    /* Hide Streamlit top bar and menu */
    header {visibility: hidden;}
    .st-emotion-cache-1avcm0n {visibility: hidden; height: 0px;}
    .st-emotion-cache-6qob1r {visibility: hidden; height: 0px;}
    .stDeployButton {display: none;}
</style>
""", unsafe_allow_html=True)
