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

## Temporary Test Session Token (for backend testing)
**NOTE:** This is a development-only token for E2E testing of the Incubex flow. Created Feb 12, 2026.
- Token: `test_session_5c7f95f52d2d493991c8e6aa1d54e2c2`
- Bound user: `gp@sus10.ai` (user_id: `user_e4e27c763fa2`, role: admin)
- Expires: 24 hours from creation
- Usage: `curl -H "Authorization: Bearer test_session_5c7f95f52d2d493991c8e6aa1d54e2c2" ...`

## Test Project (Incubex Bangalore)
- Group ID: `grp_12f524b3caa6`
- Contains 3 Incubex Bangalore locations (HSROHQ, Manyata Tech Park, KRM1)
- Use for testing sustenance rollup endpoint
