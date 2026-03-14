# Valid models per provider — must match the PROVIDERS list in api/misc/router.py
PROVIDER_MODELS = {
    "openai": ["gpt-5.2", "gpt-5-mini", "gpt-5-nano", "gpt-4.1-mini"],
    "anthropic": ["claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5"],
    "gemini": ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-flash"],
    "azure_openai": [],  # Uses deployment name from Azure config
    "langdock": [
        # "gpt-5.2", "gpt-5.2-pro",  # Disabled — see user_stories/langdock_openai_bug_report.md
        "claude-sonnet-4-6-default", "claude-opus-4-6-default",
        # "gemini-2.5-pro", "gemini-2.5-flash",  # Temporarily disabled
    ],
}

ACTION_REGISTRY = [
    {
        "action_id": "change_theme",
        "description": "Change the app theme (light/dark/system)",
        "params": {"theme": {"type": "string", "enum": ["light", "dark", "system"]}},
    },
    {
        "action_id": "switch_app_mode",
        "description": "Switch between standard and realtime mode. NOTE: This is NOT for switching storage mode (local/account). Storage mode can only be changed via the user avatar menu and cannot be changed through actions.",
        "params": {"mode": {"type": "string", "enum": ["standard", "realtime"]}},
    },
    {
        "action_id": "change_provider",
        "description": "Change the default LLM provider. You MUST also use change_model in a follow-up to set a valid model for the new provider.",
        "params": {"provider": {"type": "string", "enum": list(PROVIDER_MODELS.keys())}},
    },
    {
        "action_id": "change_model",
        "description": "Change the selected LLM model. You MUST only use models that are valid for the current provider.",
        "params": {"model": {"type": "string"}},
        "valid_models_per_provider": PROVIDER_MODELS,
    },
    {
        "action_id": "toggle_advanced_settings",
        "description": "Enable or disable advanced settings. When disabled, only essential settings are shown (API Keys, AI Model, and this toggle). When enabled, all configuration options are visible.",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "toggle_sync_mode",
        "description": "Enable or disable sync mode (Standard + Realtime). When enabled, starting one mode automatically starts the other with shared microphone input.",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "toggle_speaker_key_points",
        "description": "Enable or disable automatic speaker key point extraction",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "toggle_speaker_labels",
        "description": "Enable or disable speaker label suggestions. When enabled, the app suggests real speaker names from transcript content when extracting key points.",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "change_speaker_count",
        "description": "Change the expected min/max number of speakers",
        "params": {"min": {"type": "integer"}, "max": {"type": "integer"}},
    },
    {
        "action_id": "update_realtime_system_prompt",
        "description": "Update the system prompt used for realtime summary generation",
        "params": {"prompt": {"type": "string", "description": "The new system prompt text"}},
    },
    {
        "action_id": "change_realtime_interval",
        "description": "Change the realtime summary interval in minutes",
        "params": {"minutes": {"type": "integer", "enum": [1, 2, 3, 5, 10]}},
    },
    {
        "action_id": "toggle_final_summary",
        "description": "Enable or disable final summary generation when stopping realtime recording",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "toggle_reevaluate_all_questions",
        "description": "Enable or disable re-evaluating already answered questions when manually refreshing Questions & Topics. When enabled, the manual refresh button sends all questions (including answered ones) to the LLM for re-evaluation.",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "toggle_standard_timestamps",
        "description": "Show or hide timestamps on each utterance in the Standard mode transcript view. When visible, timestamps are also included in copy/download and LLM requests.",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "change_realtime_speech_model",
        "description": "Change the realtime speech model. 'fast' provides word-by-word streaming without speaker labels. 'precise' provides turn-based streaming with speaker diarization (speaker labels). Takes effect on the next session start.",
        "params": {"model": {"type": "string", "enum": ["fast", "precise"]}},
    },
    {
        "action_id": "change_default_copy_format",
        "description": "Change the default format used when copying content (transcript, summary, etc.) to the clipboard",
        "params": {
            "format": {
                "type": "string",
                "enum": ["formatted", "plain", "markdown", "json"],
                "labels": {
                    "formatted": "Formatted Text",
                    "plain": "Plain Text",
                    "markdown": "Markdown",
                    "json": "JSON",
                },
            },
        },
    },
    {
        "action_id": "change_default_save_format",
        "description": "Change the default file format used when saving/downloading content (transcript, summary, etc.)",
        "params": {
            "format": {
                "type": "string",
                "enum": ["txt", "md", "docx", "pdf", "html", "json"],
                "labels": {
                    "txt": ".txt (Plain Text)",
                    "md": ".md (Markdown)",
                    "docx": ".docx (Word Document)",
                    "pdf": ".pdf (PDF)",
                    "html": ".html (HTML)",
                    "json": ".json (JSON)",
                },
            },
        },
    },
    {
        "action_id": "change_default_chatbot_copy_format",
        "description": "Change the default format used when copying chatbot messages to the clipboard",
        "params": {
            "format": {
                "type": "string",
                "enum": ["markdown", "plain", "formatted"],
                "labels": {
                    "markdown": "Markdown (raw source)",
                    "plain": "Plain Text (no formatting)",
                    "formatted": "Formatted Text (rich text with styling)",
                },
            },
        },
    },
    {
        "action_id": "update_api_key",
        "description": "Update an API key for a provider",
        "params": {"provider": {"type": "string"}, "key": {"type": "string"}},
    },
    {
        "action_id": "open_settings",
        "description": "Open the settings panel",
        "params": {},
    },
    {
        "action_id": "save_prompt_template",
        "description": "Save a new custom prompt template for summary generation. Use this when the user asks you to create, write, or generate a prompt template.",
        "params": {
            "name": {"type": "string", "description": "Template name"},
            "content": {"type": "string", "description": "The full prompt text"},
        },
    },
    {
        "action_id": "list_prompt_templates",
        "description": "List all custom prompt templates. This is a read-only action that does NOT require user confirmation. The full template data is available in app_context; present the list in your text response.",
        "params": {},
    },
    {
        "action_id": "get_prompt_template",
        "description": "Show the full content of a specific prompt template. This is a read-only action that does NOT require user confirmation. The full template content is available in app_context; present the details in your text response.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
        },
    },
    {
        "action_id": "update_prompt_template",
        "description": "Update an existing custom prompt template. You MUST use the exact template ID from the app_context custom_templates list.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
            "name": {"type": "string", "description": "New template name"},
            "content": {"type": "string", "description": "New full prompt text"},
        },
    },
    {
        "action_id": "delete_prompt_template",
        "description": "Delete an existing custom prompt template. You MUST use the exact template ID from the app_context custom_templates list.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
        },
    },
    {
        "action_id": "save_form_template",
        "description": "Save a new form template for structured data extraction. Use this when the user asks you to create or design a form template.",
        "params": {
            "name": {"type": "string", "description": "Template name"},
            "fields": {
                "type": "array",
                "description": "List of field definitions",
                "items": {
                    "label": {"type": "string"},
                    "type": {"type": "string", "enum": ["string", "number", "date", "boolean", "list_str", "enum", "multi_select"]},
                    "description": {"type": "string", "description": "Optional hint for the AI during form filling"},
                    "options": {"type": "array", "description": "Required for enum and multi_select types"},
                },
            },
        },
    },
    {
        "action_id": "list_form_templates",
        "description": "List all custom form templates. This is a read-only action that does NOT require user confirmation. The full template data is available in app_context; present the list in your text response.",
        "params": {},
    },
    {
        "action_id": "get_form_template",
        "description": "Show the full details and fields of a specific form template. This is a read-only action that does NOT require user confirmation. The full template fields are available in app_context; present the details in your text response.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
        },
    },
    {
        "action_id": "update_form_template",
        "description": "Update an existing form template. You MUST use the exact template ID from the app_context custom_form_templates list.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
            "name": {"type": "string", "description": "New template name"},
            "fields": {
                "type": "array",
                "description": "Updated list of field definitions",
                "items": {
                    "label": {"type": "string"},
                    "type": {"type": "string", "enum": ["string", "number", "date", "boolean", "list_str", "enum", "multi_select"]},
                    "description": {"type": "string", "description": "Optional hint for the AI during form filling"},
                    "options": {"type": "array", "description": "Required for enum and multi_select types"},
                },
            },
        },
    },
    {
        "action_id": "delete_form_template",
        "description": "Delete an existing form template. You MUST use the exact template ID from the app_context custom_form_templates list.",
        "params": {
            "id": {"type": "string", "description": "The template ID (from app_context)"},
        },
    },
    # --- Keyterms list management ---
    {
        "action_id": "save_keyterms_list",
        "description": "Save a new keyterms list for transcription prompting. Use this when the user asks to create a list of domain-specific terms that should be recognized correctly during transcription.",
        "params": {
            "name": {"type": "string", "description": "The list name (e.g., 'Project Alpha', 'Medical Terms')"},
            "terms": {"type": "array", "items": {"type": "string"}, "description": "Array of keyterms/phrases to boost during transcription"},
        },
    },
    {
        "action_id": "list_keyterms_lists",
        "description": "List all keyterms lists. Read-only action. Data is available in app_context.keyterms_lists.",
        "params": {},
    },
    {
        "action_id": "get_keyterms_list",
        "description": "Show details of a specific keyterms list. Read-only action. Data is available in app_context.keyterms_lists.",
        "params": {
            "id": {"type": "string", "description": "The list ID (from app_context)"},
        },
    },
    {
        "action_id": "update_keyterms_list",
        "description": "Update an existing keyterms list. You MUST use the exact list ID from the app_context keyterms_lists.",
        "params": {
            "id": {"type": "string", "description": "The list ID (from app_context)"},
            "name": {"type": "string", "description": "The updated list name"},
            "terms": {"type": "array", "items": {"type": "string"}, "description": "The updated array of keyterms"},
        },
    },
    {
        "action_id": "delete_keyterms_list",
        "description": "Delete an existing keyterms list. You MUST use the exact list ID from the app_context keyterms_lists.",
        "params": {
            "id": {"type": "string", "description": "The list ID (from app_context)"},
        },
    },
    {
        "action_id": "select_keyterms_list",
        "description": "Select a keyterms list for use in transcription, or deselect all by passing an empty string.",
        "params": {
            "id": {"type": "string", "description": "The list ID to select, or empty string to deselect"},
        },
    },
    {
        "action_id": "reset_all_settings",
        "description": "Reset all settings to their factory defaults. This resets provider, model, all toggles, intervals, formats, system prompt, feature overrides, and keyterms selection. API keys are NOT affected.",
        "params": {},
    },
    {
        "action_id": "set_webhook_url",
        "description": "Set or clear the webhook URL. When set, webhooks will be sent to this URL at configured trigger points after transcription, summary generation, or realtime session completion.",
        "params": {
            "url": {"type": "string", "description": "The webhook URL (e.g. https://example.com/webhook), or empty string to disable"},
        },
    },
    {
        "action_id": "set_webhook_secret",
        "description": "Set or clear the webhook HMAC secret used for signing webhook payloads with X-Webhook-Signature header.",
        "params": {
            "secret": {"type": "string", "description": "The HMAC secret, or empty string to clear"},
        },
    },
    {
        "action_id": "set_webhook_standard_trigger",
        "description": "Set when webhooks fire in standard mode. Options: 'summary' (fire after summary/form output) or 'transcript_and_summary' (fire after transcript AND after summary/form output).",
        "params": {
            "trigger": {"type": "string", "enum": ["summary", "transcript_and_summary"], "description": "When to fire webhooks in standard mode"},
        },
    },
    {
        "action_id": "set_webhook_realtime_trigger",
        "description": "Set when webhooks fire in realtime mode. Options: 'on_stop' (when session stops), 'on_stop_with_final_summary' (after final summary, falls back to on_stop if disabled), 'only_with_final_summary' (only if final summary is enabled).",
        "params": {
            "trigger": {"type": "string", "enum": ["on_stop", "on_stop_with_final_summary", "only_with_final_summary"], "description": "When to fire webhooks in realtime mode"},
        },
    },
]
