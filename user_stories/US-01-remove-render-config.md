# US-01 — Remove Render Configuration

**Epic**: Epic 1 — Cleanup
**Depends on**: —
**Blocks**: US-02

---

## Goal

Remove all Render-specific files, environment variables, and documentation references from the codebase to prepare for self-hosted Hetzner deployment.

---

## Background

The project was previously deployed on Render using a `render.yaml` Blueprint. Moving to a self-hosted Ubuntu server on Hetzner makes the Render config obsolete. Leaving it in the codebase creates confusion and may reference outdated URLs/settings.

---

## Acceptance Criteria

- [ ] `render.yaml` is deleted from the project root
- [ ] Any comments or code references to Render URLs (e.g. `onrender.com`) are removed
- [ ] The Render Deployment Guide section in `docs/architecture.md` is removed or replaced with a placeholder note ("Deployment guide coming soon — see docker-compose.yml for local/self-hosted setup")
- [ ] `CLAUDE.md` no longer references Render
- [ ] `docker-compose.yml` is updated to reflect the new production target (klartextai.com) where hardcoded URLs appear
- [ ] All `.env.example` files still contain all necessary variables (no Render-specific vars are left as the sole documentation)

---

## Files Likely Affected

- `render.yaml` — delete
- `docs/architecture.md` — remove Render Deployment Guide section
- `CLAUDE.md` — update if Render is mentioned
- `docker-compose.yml` — update hardcoded production URLs if any

---

## Notes

- Do not remove Docker-related content — Docker Compose is the deployment mechanism going forward.
- Do not remove GCP Setup Guide from `docs/architecture.md` — Google OAuth is still used.
