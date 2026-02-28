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
]
