---
name: investigate-prod
description: Investigate potential issues on the deployed production application. Connects via SSH to inspect logs, services, and configuration. Triggered with "/investigate-prod".
---

# Investigate Production

You are investigating a potential issue on the deployed AIAudioSummary production server.

## Step 1: Get the server IP

Use `AskUserQuestion` to ask the user for the server IP address. Format the question as: "What is the IP address of the production server?"

Store the IP for all subsequent SSH commands: `ssh root@<IP>`

## Step 2: Understand the issue

Read the user's `$ARGUMENTS` to understand what they want to investigate. If the issue description is vague or missing, ask the user to describe the symptoms (e.g., 502 errors, slow responses, feature not working, etc.).

## Production Environment Reference

Use this as your mental model of the production setup:

- **App directory**: `/opt/AIAudioSummary`
- **Orchestration**: `docker compose` (compose file at `/opt/AIAudioSummary/docker-compose.yml`)
- **Services**:
  - `frontend` — Next.js app on port 3000 (internal)
  - `backend` — FastAPI (uvicorn) on port 8080 (internal)
  - `postgres` — PostgreSQL 16 on port 5432 (internal)
- **Reverse proxy**: nginx (system service, not containerized)
  - Config: `/etc/nginx/sites-enabled/`
  - Error log: `/var/log/nginx/error.log`
  - Access log: `/var/log/nginx/access.log`
- **SSL**: Let's Encrypt via Certbot

## Step 3: Investigate

Run diagnostic commands via SSH. Choose the appropriate checks based on the reported issue:

### Service health

```bash
ssh root@<IP> "cd /opt/AIAudioSummary && docker compose ps"
ssh root@<IP> "systemctl status nginx"
```

### Docker logs (start here for most issues)

```bash
# Recent logs for all services
ssh root@<IP> "cd /opt/AIAudioSummary && docker compose logs --tail=100 --timestamps"
# Filter to a specific service
ssh root@<IP> "cd /opt/AIAudioSummary && docker compose logs backend --tail=200 --timestamps"
ssh root@<IP> "cd /opt/AIAudioSummary && docker compose logs frontend --tail=200 --timestamps"
```

### Nginx logs (for 502, 504, connection errors)

```bash
ssh root@<IP> "tail -50 /var/log/nginx/error.log"
ssh root@<IP> "tail -50 /var/log/nginx/access.log"
```

### Nginx config

```bash
ssh root@<IP> "cat /etc/nginx/sites-enabled/*"
ssh root@<IP> "nginx -t"  # Test config validity
```

### Resource usage

```bash
ssh root@<IP> "docker stats --no-stream"
ssh root@<IP> "df -h"
ssh root@<IP> "free -m"
```

### Direct backend/frontend testing

```bash
# Bypass nginx — hit services directly
ssh root@<IP> "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/"
ssh root@<IP> "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/"
```

### Database

```bash
ssh root@<IP> "cd /opt/AIAudioSummary && docker compose exec postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c 'SELECT 1'"
```

## Step 4: Diagnose

After collecting evidence, synthesize your findings:

1. **Identify the failing layer** — Is it nginx, frontend, backend, database, or external API?
2. **Find the root cause** — Look at error messages, timestamps, and request flows.
3. **Correlate across services** — Match timestamps in nginx errors with docker logs.

Present a clear diagnosis to the user explaining:

- What is failing and why
- The chain of events leading to the error
- Which component is the root cause

## Step 5: Fix

Apply fixes based on what you can change directly vs. what needs local development:

### Direct fixes on production (allowed)

You MAY directly edit or restart on the server:

- **Nginx configuration**: edit files in `/etc/nginx/sites-enabled/`, then `nginx -t && systemctl reload nginx`
- **Restart services**: `docker compose restart <service>` or `docker compose up -d --build <service>`
- **Environment variables**: edit `.env` files in `/opt/AIAudioSummary/`
- **Docker compose config**: minor operational tweaks (restart policies, resource limits)

### Local-only fixes (requires deployment)

You must NOT edit on the server — instead make changes locally:

- **Frontend code** (Next.js / React / TypeScript)
- **Backend code** (FastAPI / Python)
- **Dockerfile** changes
- **docker-compose.yml** structural changes

For local-only fixes:

1. Make the changes on the local machine
2. Inform the user that the fix requires deployment
3. Offer to push to git: `git add -A && git commit && git push`
4. Prod app will automatically pull and redeploy on push to main branch

## Important: File Ownership Rules

**Never run git commands as root** in `/opt/AIAudioSummary`. The repository is owned by the `deploy` user, and running git as root creates objects with `root:root` ownership, which breaks the CI/CD pipeline (the `deploy` user can no longer write to `.git/objects/`).

If you need to run git commands while SSHed in as root, always use:

```bash
ssh root@<IP> "su - deploy -c 'cd /opt/AIAudioSummary && git pull origin main'"
```

If you encounter git permission errors (`insufficient permission for adding an object to repository database .git/objects`), fix ownership with:

```bash
ssh root@<IP> "chown -R deploy:deploy /opt/AIAudioSummary/.git"
```

## Step 6: Verify

After applying any fix, verify it worked:

1. Re-run the diagnostic commands that revealed the issue
2. Test the specific user flow that was broken
3. Check that no new errors appeared in nginx or docker logs
4. Report the results to the user
