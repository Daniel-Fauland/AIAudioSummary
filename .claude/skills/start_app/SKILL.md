---
name: start-app
description: Stops existing Docker containers and rebuilds/restarts the app with docker compose. Notifies the user if Docker is not running.
---

# Start App

Rebuild and restart the AIAudioSummary Docker containers.

## Steps

1. **Check if Docker is running** by executing `docker info`. If it fails, notify the user that the Docker daemon is not running and stop.

2. **Stop existing containers** by running `docker compose down` in the project root.

3. **Rebuild and start** by running `docker compose up --build -d` in the project root.

4. **Prune old Docker artifacts** by running `docker image prune -f` and `docker builder prune -f` to remove dangling images and stale build cache.

5. **Report the result** to the user — whether the app started successfully or if there were errors.
