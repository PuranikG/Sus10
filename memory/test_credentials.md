# Sus10 AI - Test Credentials

## Admin Users (Google OAuth)
Production allowlist (Feb 19, 2026) — controlled by `AUTH_ALLOWLIST_EMAILS` in `/app/backend/.env`:
- `gp@sus10.ai` (primary admin)
- `vgpuranik@gmail.com` (admin)
- `urjacity@gmail.com`
- `shivani@sus10.ai`
- `gaurav.a.puranik@gmail.com`

Disable the allowlist by setting `AUTH_ALLOWLIST_ENABLED=false`.
Beta-rejection contact email: `hello@sus10.ai` (via `AUTH_CONTACT_EMAIL`).

## Temporary Test Session Token (for backend / Playwright testing)
**NOTE:** Dev-only token. Created May 18, 2026 (iteration_10).
- Token: `iter10_fe_session`
- Bound user: `gp@sus10.ai` (user_id: `user_e4e27c763fa2`, role: admin)
- Storage: `db.user_sessions` collection (NOT `db.sessions`) — backend `get_current_user` reads from `user_sessions`.
- Expires: 24 hours from creation.
- Usage:
  - HTTP: `curl -H "Authorization: Bearer iter10_fe_session" $REACT_APP_BACKEND_URL/api/auth/me`
  - Playwright: set cookie `session_token=iter10_fe_session` on domain `sus10-preview.preview.emergentagent.com`, path `/`, secure, sameSite Lax.

## Test Project (Incubex Bangalore)
- Group ID: `grp_12f524b3caa6`
- Contains 3 Incubex Bangalore locations (HSROHQ, Manyata Tech Park, KRM1)
- Use for testing sustenance rollup endpoint
