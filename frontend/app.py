import streamlit as st
import requests
import tempfile
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import date

# --- LOAD ENV ---
load_dotenv(dotenv_path=Path(__file__).parent / ".env")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
TRANSCRIPT_ENDPOINT = f"{BACKEND_URL}/createTranscript"
SUMMARY_ENDPOINT = f"{BACKEND_URL}/createSummary"
GET_CONFIG_ENDPOINT = f"{BACKEND_URL}/getConfig"
GET_SPEAKERS_ENDPOINT = f"{BACKEND_URL}/getSpeakers"
UPDATE_SPEAKERS_ENDPOINT = f"{BACKEND_URL}/updateSpeakers"

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

# --- SIDEBAR ---
with st.sidebar:
    st.header("Settings")
    
    # API Keys
    st.subheader("API Keys")
    openai_key = st.text_input("OpenAI API Key", type="password", help="Required for AI summary generation")
    assemblyai_key = st.text_input("AssemblyAI API Key", type="password", help="Required for audio transcription")
    
    # Speaker Settings
    st.subheader("Speaker Settings")
    min_speaker = st.number_input("Minimum Speakers", min_value=1, max_value=20, value=1, help="Minimum number of speakers expected in the audio")
    max_speaker = st.number_input("Maximum Speakers", min_value=1, max_value=20, value=10, help="Maximum number of speakers expected in the audio")
    
    # Store in session state
    st.session_state.openai_key = openai_key
    st.session_state.assemblyai_key = assemblyai_key
    st.session_state.min_speaker = min_speaker
    st.session_state.max_speaker = max_speaker

st.title("AI Audio Meeting Summarizer")
st.markdown("""
Upload an audio file, transcribe it, identify speakers, and generate a summary using AI.
""")

# --- SESSION STATE ---
if "transcript" not in st.session_state:
    st.session_state.transcript = ""
if "summary" not in st.session_state:
    st.session_state.summary = ""
if "system_prompt" not in st.session_state:
    st.session_state.system_prompt = ""
if "processing" not in st.session_state:
    st.session_state.processing = False
if "speakers" not in st.session_state:
    st.session_state.speakers = []
if "speaker_mapping" not in st.session_state:
    st.session_state.speaker_mapping = {}
if "selected_template" not in st.session_state:
    st.session_state.selected_template = ""
if "template_content" not in st.session_state:
    st.session_state.template_content = ""
if "transcription_done" not in st.session_state:
    st.session_state.transcription_done = False

# --- FILE UPLOAD ---
uploaded_file = st.file_uploader("Upload your audio file", type=[
                                 "mp3", "wav", "m4a", "ogg", "flac"], help="Supported formats: mp3, wav, m4a, ogg, flac")

# --- TRANSCRIPTION BUTTON ---
def transcribe_audio():
    if not uploaded_file:
        st.error("Please upload an audio file first.")
        return
    
    if not st.session_state.assemblyai_key:
        st.error("Please enter your AssemblyAI API key in the sidebar.")
        return
    
    st.session_state.processing = True
    st.session_state.transcript = ""
    st.session_state.speakers = []
    st.session_state.speaker_mapping = {}
    st.session_state.transcription_done = False
    
    temp_dir = tempfile.mkdtemp(dir=Path(__file__).parent)
    temp_path = os.path.join(temp_dir, uploaded_file.name)
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        
        # Call backend for transcript
        files = {"file": (uploaded_file.name, open(temp_path, "rb"), uploaded_file.type)}
        data = {
            "api_key": st.session_state.assemblyai_key,
            "min_speaker": st.session_state.min_speaker,
            "max_speaker": st.session_state.max_speaker
        }
        
        with st.spinner("Transcribing audio..."):
            resp = requests.post(TRANSCRIPT_ENDPOINT, files=files, data=data)
            resp.raise_for_status()
            transcript = resp.json().get("transcript", "")
            st.session_state.transcript = transcript
        
        # Automatically detect speakers
        if transcript:
            with st.spinner("Detecting speakers..."):
                speakers_data = {"transcript": transcript}
                speakers_resp = requests.post(GET_SPEAKERS_ENDPOINT, json=speakers_data)
                speakers_resp.raise_for_status()
                speakers = speakers_resp.json().get("speakers", [])
                st.session_state.speakers = speakers
                # Initialize speaker mapping with default names
                st.session_state.speaker_mapping = {speaker: speaker for speaker in speakers}
        
        st.session_state.transcription_done = True
        st.success("Transcription completed! Speakers detected.")
        
    except Exception as e:
        st.error(f"Error during transcription: {str(e)}")
    finally:
        # Clean up temp file and dir
        try:
            if 'files' in locals():
                files["file"][1].close()
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
        st.session_state.processing = False

transcribe_btn = st.button(
    "Start Transcription",
    type="primary",
    disabled=not uploaded_file or st.session_state.processing,
    help="Transcribe the uploaded audio file and detect speakers."
)

if transcribe_btn and uploaded_file:
    transcribe_audio()

# --- SPEAKER MAPPING GRID ---
if st.session_state.transcription_done and st.session_state.speakers:
    st.markdown("---")
    st.subheader("Speaker Name Mapping")
    st.markdown("Update speaker names to make the transcript more readable:")
    
    # Create columns for speaker mapping
    cols = st.columns(min(len(st.session_state.speakers), 3))
    for i, speaker in enumerate(st.session_state.speakers):
        with cols[i % 3]:
            new_name = st.text_input(
                f"Speaker: {speaker}",
                value=st.session_state.speaker_mapping.get(speaker, speaker),
                key=f"speaker_{i}",
                help=f"Enter a name for {speaker}"
            )
            st.session_state.speaker_mapping[speaker] = new_name
    
    # Update transcript with new speaker names
    if st.button("Update Transcript with Speaker Names"):
        try:
            update_data = {
                "transcript": st.session_state.transcript,
                "speakers": st.session_state.speaker_mapping
            }
            resp = requests.post(UPDATE_SPEAKERS_ENDPOINT, json=update_data)
            resp.raise_for_status()
            updated_transcript = resp.json().get("transcript", "")
            st.session_state.transcript = updated_transcript
            st.success("Transcript updated with speaker names!")
        except Exception as e:
            st.error(f"Error updating transcript: {str(e)}")

# --- PROMPT TEMPLATE SELECTION ---
if st.session_state.transcription_done:
    st.markdown("---")
    st.subheader("Prompt Template Selection")
    
    # Fetch available templates
    if not st.session_state.config.get("prompt_templates"):
        try:
            config_resp = requests.get(GET_CONFIG_ENDPOINT)
            config_resp.raise_for_status()
            st.session_state.config = config_resp.json()
        except Exception as e:
            st.error(f"Error fetching templates: {str(e)}")
    
    templates = st.session_state.config.get("prompt_templates", {})
    if templates:
        template_names = list(templates.keys())
        selected_template = st.radio(
            "Select a prompt template:",
            template_names,
            key="template_radio"
        )
        
        if selected_template:
            st.session_state.selected_template = selected_template
            st.session_state.template_content = templates[selected_template]
            
            # Editable template content
            st.markdown("**Edit the prompt template:**")
            edited_content = st.text_area(
                "Template Content",
                value=st.session_state.template_content,
                height=200,
                key="template_editor"
            )
            st.session_state.template_content = edited_content
    else:
        st.warning("No prompt templates available. Please check the backend configuration.")

# --- AI SUMMARY GENERATION ---
if st.session_state.transcription_done and st.session_state.template_content:
    st.markdown("---")
    st.subheader("Generate AI Summary")
    
    if st.button("Generate Summary", type="primary"):
        if not st.session_state.openai_key:
            st.error("Please enter your OpenAI API key in the sidebar.")
        elif not st.session_state.transcript:
            st.error("No transcript available.")
        else:
            try:
                with st.spinner("Generating AI summary..."):
                    summary_data = {
                        "text": st.session_state.transcript,
                        "system_prompt": st.session_state.template_content,
                        "openai_key": st.session_state.openai_key,
                        "stream": False,
                        "date": date.today().isoformat()
                    }
                    
                    resp = requests.post(SUMMARY_ENDPOINT, json=summary_data)
                    resp.raise_for_status()
                    summary = resp.json().get("summary", "")
                    st.session_state.summary = summary
                    
                st.success("Summary generated successfully!")
            except Exception as e:
                st.error(f"Error generating summary: {str(e)}")

# --- DISPLAY RESULTS ---
if st.session_state.transcript:
    st.markdown("---")
    st.subheader("Transcript")
    st.text_area(
        "Transcript",
        value=st.session_state.transcript,
        height=300,
        key="transcript_display",
        disabled=True
    )

if st.session_state.summary:
    st.markdown("---")
    st.subheader("AI Summary")
    st.markdown(st.session_state.summary)


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
