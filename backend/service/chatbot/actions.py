# Valid models per provider — must match the PROVIDERS list in api/misc/router.py
PROVIDER_MODELS = {
    "openai": ["gpt-5.2", "gpt-5-mini", "gpt-5-nano", "gpt-4.1-mini"],
    "anthropic": ["claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5"],
    "gemini": ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-flash"],
    "azure_openai": [],  # Uses deployment name from Azure config
    "langdock": [
        "gpt-5.2", "gpt-5.2-pro",
        "claude-sonnet-4-5-20250929", "claude-sonnet-4-6-default", "claude-opus-4-6-default",
        "gemini-2.5-pro", "gemini-2.5-flash",
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
        "action_id": "toggle_speaker_key_points",
        "description": "Enable or disable automatic speaker key point extraction",
        "params": {"enabled": {"type": "boolean"}},
    },
    {
        "action_id": "change_speaker_count",
        "description": "Change the expected min/max number of speakers",
        "params": {"min": {"type": "integer"}, "max": {"type": "integer"}},
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
]
