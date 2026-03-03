.PHONY: start stop local local_dev app help

.DEFAULT_GOAL := help

# ── Help ─────────────────────────────────────────────────────────────
help:
	@printf "\n"
	@printf "\033[1;36mAIAudioSummary — Docker Commands\033[0m\n"
	@printf "\n"
	@printf "\033[1mStart commands:\033[0m\n"
	@printf "  make start app          Production build (Google Auth)\n"
	@printf "  make start local        Local build, no auth (auto-login as user@example.com)\n"
	@printf "  make start local_dev    Local dev with hot-reload, no auth (auto-login)\n"
	@printf "\n"
	@printf "\033[1mStop commands:\033[0m\n"
	@printf "  make stop app           Stop production app\n"
	@printf "  make stop local         Stop local app (works for both local & local_dev)\n"
	@printf "\n"
	@printf "\033[1mURLs when running:\033[0m\n"
	@printf "  Frontend:  http://localhost:3000\n"
	@printf "  Backend:   http://localhost:8080\n"
	@printf "\n"

# ── Start ────────────────────────────────────────────────────────────
start:
ifeq ($(filter local_dev,$(MAKECMDGOALS)),local_dev)
	@docker info >/dev/null 2>&1 || { printf "\033[0;31mError: Docker is not running. Please start Docker first.\033[0m\n"; exit 1; }
	@printf "\033[0;36mStarting local dev mode (hot-reload, no auth)...\033[0m\n"
	@docker compose -f docker-compose.dev.yml -f docker-compose.noauth.yml up -d
	@printf "\n\033[0;32mApp is running:\033[0m\n"
	@printf "  Frontend:  \033[0;36mhttp://localhost:3000\033[0m\n"
	@printf "  Backend:   \033[0;36mhttp://localhost:8080\033[0m\n"
	@printf "\n  Stop with: \033[0;33mmake stop local\033[0m\n\n"
else ifeq ($(filter local,$(MAKECMDGOALS)),local)
	@docker info >/dev/null 2>&1 || { printf "\033[0;31mError: Docker is not running. Please start Docker first.\033[0m\n"; exit 1; }
	@printf "\033[0;36mStarting local build (no auth)...\033[0m\n"
	@docker compose -f docker-compose.yml -f docker-compose.noauth.yml up --build -d
	@printf "\n\033[0;32mApp is running:\033[0m\n"
	@printf "  Frontend:  \033[0;36mhttp://localhost:3000\033[0m\n"
	@printf "  Backend:   \033[0;36mhttp://localhost:8080\033[0m\n"
	@printf "\n  Stop with: \033[0;33mmake stop local\033[0m\n\n"
else ifeq ($(filter app,$(MAKECMDGOALS)),app)
	@docker info >/dev/null 2>&1 || { printf "\033[0;31mError: Docker is not running. Please start Docker first.\033[0m\n"; exit 1; }
	@printf "\033[0;36mStarting production app (Google Auth)...\033[0m\n"
	@docker compose up --build -d
	@printf "\n\033[0;32mApp is running:\033[0m\n"
	@printf "  Frontend:  \033[0;36mhttp://localhost:3000\033[0m\n"
	@printf "  Backend:   \033[0;36mhttp://localhost:8080\033[0m\n"
	@printf "\n  Stop with: \033[0;33mmake stop app\033[0m\n\n"
else
	@printf "Usage: make start [app|local|local_dev]\n"
	@printf "Run 'make help' for details.\n"
endif

# ── Stop ─────────────────────────────────────────────────────────────
stop:
ifneq ($(filter local local_dev,$(MAKECMDGOALS)),)
	@docker info >/dev/null 2>&1 || { printf "\033[0;31mError: Docker is not running. Please start Docker first.\033[0m\n"; exit 1; }
	@printf "\033[0;36mStopping local containers...\033[0m\n"
	-@docker compose -f docker-compose.dev.yml -f docker-compose.noauth.yml down 2>/dev/null
	-@docker compose -f docker-compose.yml -f docker-compose.noauth.yml down 2>/dev/null
	@printf "\033[0;36mPruning unused images...\033[0m\n"
	@docker image prune -f
	@printf "\n\033[0;32mStopped.\033[0m\n"
	@printf "  Start with: \033[0;33mmake start local\033[0m  or  \033[0;33mmake start local_dev\033[0m\n\n"
else ifeq ($(filter app,$(MAKECMDGOALS)),app)
	@docker info >/dev/null 2>&1 || { printf "\033[0;31mError: Docker is not running. Please start Docker first.\033[0m\n"; exit 1; }
	@printf "\033[0;36mStopping production app...\033[0m\n"
	@docker compose down
	@printf "\033[0;36mPruning unused images...\033[0m\n"
	@docker image prune -f
	@printf "\n\033[0;32mStopped.\033[0m\n"
	@printf "  Start with: \033[0;33mmake start app\033[0m\n\n"
else
	@printf "Usage: make stop [app|local]\n"
	@printf "Run 'make help' for details.\n"
endif

# No-op targets used as arguments to start/stop
local local_dev app:
	@:
