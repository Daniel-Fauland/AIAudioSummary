---
name: stop-app
description: Gracefully shuts down all Docker containers for the app. Notifies the user if Docker is not running.
---

# Stop App

Gracefully shut down the AIAudioSummary Docker containers.

## Steps

1. **Check if Docker is running** by executing `docker info`. If it fails, notify the user that the Docker daemon is not running and stop.

2. **Check if any containers are running** by executing `docker compose ps` in the project root. If no containers are running, inform the user that the app is already stopped.

3. **Stop the containers** by running `docker compose down` in the project root.

4. **Verify shutdown** by running `docker compose ps` again to confirm all containers are stopped.

5. **Report the result** to the user — whether the app was stopped successfully or if there were errors.
