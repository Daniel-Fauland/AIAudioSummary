# AIAudioSummary — Migration & User Management: Story Index

## Overall Goal

Migrate the application from Render to a self-hosted Hetzner Ubuntu server, introduce PostgreSQL for persistent user management, implement role-based access control (RBAC), and add optional server-side preference storage. All API keys continue to live exclusively in the browser's localStorage and are never sent to or stored on the server.

---

## Implementation Order

Stories must be implemented in this sequence. Each epic builds on the previous.

| # | Story File | Title | Epic | Depends On |
|---|------------|-------|------|------------|
| 01 | [US-01](./US-01-remove-render-config.md) | Remove Render Configuration | Epic 1: Cleanup | — |
| 02 | [US-02](./US-02-postgres-docker-compose.md) | Add PostgreSQL to Docker Compose | Epic 2: Database | US-01 |
| 03 | [US-03](./US-03-database-connection-migrations.md) | Backend Database Connection & Migrations | Epic 2: Database | US-02 |
| 04 | [US-04](./US-04-database-access-control.md) | Replace ALLOWED_EMAILS with DB Access Control | Epic 3: Auth | US-03 |
| 05 | [US-05](./US-05-backend-auth-endpoints.md) | Backend User & Auth Endpoints | Epic 3: Auth | US-03 |
| 06 | [US-06](./US-06-admin-page-route.md) | Admin Page Route & Access Guard | Epic 4: Admin | US-04, US-05 |
| 07 | [US-07](./US-07-admin-panel-ui.md) | Admin Panel UI | Epic 4: Admin | US-06 |
| 08 | [US-08](./US-08-profile-dropdown.md) | Profile Dropdown Menu | Epic 5: Profile | US-04, US-05 |
| 09 | [US-09](./US-09-storage-mode-toggle.md) | Storage Mode Toggle Logic | Epic 5: Profile | US-08, US-11 |
| 10 | [US-10](./US-10-preferences-sync.md) | Preferences Sync Behavior | Epic 5: Profile | US-09 |
| 11 | [US-11](./US-11-backend-preferences-endpoints.md) | Backend Preferences Endpoints | Epic 5: Profile | US-03 |
| 12 | [US-12](./US-12-privacy-policy-update.md) | Update Privacy Policy Page | Epic 6: Legal | US-09 |
| 13 | [US-13](./US-13-cookie-settings-update.md) | Update Cookie Settings Page | Epic 6: Legal | US-12 |

---

## Epic Summary

### Epic 1 — Cleanup (US-01)
Remove all Render-specific configuration from the codebase to prepare for the Hetzner self-hosted deployment.

### Epic 2 — PostgreSQL Database (US-02, US-03)
Add a PostgreSQL service to the Docker Compose stack and wire up the backend with async SQLAlchemy, Alembic migrations, and an initial `users` table. Admin users are seeded on startup from the `INITIAL_ADMINS` env var.

### Epic 3 — User Access Management (US-04, US-05)
Replace the static `ALLOWED_EMAILS` env var with a database-driven allowlist. The NextAuth `signIn` callback verifies the user's email against the `users` table. New backend endpoints expose user profile and admin-only user management.

### Epic 4 — Admin Panel (US-06, US-07)
A protected `/admin` page that only users with role `admin` can access. Admins can view all users, add new users by email, and delete non-admin users.

### Epic 5 — Profile Menu & Storage Mode (US-08, US-09, US-10, US-11)
The existing user avatar opens a dropdown with profile info, a storage mode toggle, an Admin Panel link (admin-only), and Sign Out. Users can opt in to server-side preference storage with explicit privacy consent. API keys always stay local.

### Epic 6 — Legal / Privacy Updates (US-12, US-13)
Update the Privacy Policy and Cookie Settings dialogs to reflect the new optional server-side storage capability and Hetzner hosting location.

---

## Key Architectural Constraints

- **BYOK stays local**: API keys (AssemblyAI, OpenAI, Anthropic, Gemini, Azure, Langdock) are **never** synced to the server under any circumstances.
- **Auth flow**: Google OAuth via Auth.js v5; the NextAuth `signIn` callback calls the backend to verify email access.
- **Session forwarding**: The frontend forwards the NextAuth session token to the backend for protected endpoints. The backend validates it using the shared `AUTH_SECRET`.
- **Storage default**: `storage_mode = 'local'` for all users. Server-side storage is opt-in only.
- **Admin seeding**: `INITIAL_ADMINS` env var seeds initial admins on startup but is not an ongoing source of truth — admins can only be removed via the DB directly.
