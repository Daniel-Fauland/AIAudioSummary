---
name: start-app-dev
description: Starts the app in development mode with local volume mounts for hot-reload. No rebuild needed for code changes. Notifies the user if Docker is not running.
---

# Start App (Dev)

Start the AIAudioSummary Docker containers in development mode with hot-reload.

Source code is mounted from the local filesystem so code changes apply instantly without rebuilding.

## Steps

1. **Check if Docker is running** by executing `docker info`. If it fails, notify the user that the Docker daemon is not running and stop.

2. **Stop existing containers** by running both `docker compose down` and `docker compose -f docker-compose.dev.yml down` in the project root to avoid port conflicts.

3. **Start dev containers** by running `docker compose -f docker-compose.dev.yml up -d` in the project root. Do NOT use `--build` — images are built automatically on first run and reused on subsequent runs.

4. **Report the result** to the user — whether the app started successfully or if there were errors. Remind the user that the first start may take longer while dependencies are installed into the volumes. Also mention that if they change dependencies (pyproject.toml / package.json), they should run `/start-app-dev` with `--build` or manually run `docker compose -f docker-compose.dev.yml up --build -d`.
