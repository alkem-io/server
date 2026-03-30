# Quickstart: Ory Stack Upgrade to v26.2.0

**Branch**: `082-ory-stack-upgrade` | **Date**: 2026-03-26

## Prerequisites

- Docker & Docker Compose
- Node.js 22+ (Volta-managed)
- pnpm 10.17.1+
- Running PostgreSQL (via Docker Compose)

## Step 1: Install Updated SDK

```bash
pnpm install
```

This pulls `@ory/kratos-client@^26.2.0` (upgraded from `^1.2.0`).

## Step 2: Build & Verify Compilation

```bash
pnpm build
```

Expected: Zero type errors. If type errors occur, they indicate SDK type incompatibilities that must be fixed in the affected source files.

## Step 3: Run Lint

```bash
pnpm lint
```

Expected: No new lint errors introduced by the upgrade.

## Step 4: Run Tests

```bash
pnpm test:ci:no:coverage
```

Expected: All existing tests pass. Test mocks may need updating if SDK type shapes changed.

## Step 5: Start Local Ory Services

```bash
pnpm run start:services
```

This starts the upgraded Ory stack:
- `oryd/kratos:v26.2.0` (was v1.3.1)
- `oryd/hydra:v26.2.0` (was v2.3.0)
- `oryd/oathkeeper:v26.2.0` (was v0.38.19-beta.1)

**Verify**:
1. All containers start without errors: `docker compose -f quickstart-services.yml ps`
2. Kratos migrations complete: `docker compose -f quickstart-services.yml logs kratos-migrate`
3. Hydra migrations complete: `docker compose -f quickstart-services.yml logs hydra-migrate`
4. Oathkeeper proxy responds: `curl -s http://localhost:4455/health/alive`

## Step 6: Start Server

```bash
pnpm start:dev
```

## Step 7: Manual Verification Checklist

### Authentication Flows

| Flow | How to Test | Expected |
|------|-------------|----------|
| Registration | POST to `/graphql` with `createUser` mutation, or use the UI | Account created, session issued |
| Login (password) | POST login credentials via Kratos | Valid session returned |
| Session extension | Authenticate and wait for session to near expiry | Session extended silently (server logs show 204) |
| Session validation | Send request with valid session cookie through Oathkeeper | Request reaches server with identity context |

### Header Forwarding (Oathkeeper)

Send a request through Oathkeeper (`localhost:4455`) with custom headers and verify they reach the server:

```bash
curl -v http://localhost:4455/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: ory_kratos_session=<valid_session_cookie>" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -H "True-Client-Ip: 5.6.7.8" \
  -H "x-alkemio-hub: test-hub" \
  -H "X-Geo: US" \
  -H "X-Request-ID: test-req-123" \
  -d '{"query": "{ me { id } }"}'
```

**Verify**: Server logs show the custom headers are present in the incoming request.

### Oathkeeper Security Fixes

| CVE | Verification |
|-----|-------------|
| CVE-2026-33495 (X-Forwarded-Proto trust) | `trust_forwarded_headers: true` set → Traefik's X-Forwarded-Proto preserved |
| CVE-2026-33494 (Path traversal) | Try `curl http://localhost:4455/graphql/../admin` → should NOT bypass rules |

## Troubleshooting

### Kratos migration fails
```bash
docker compose -f quickstart-services.yml logs kratos-migrate
```
If migration errors: check if the Kratos database has incompatible schema. Back up and reset if needed:
```bash
docker compose -f quickstart-services.yml down -v  # Removes volumes
pnpm run start:services                              # Fresh start
```

### SDK type compilation errors
Run `pnpm build` and fix each error. Common patterns:
- Renamed fields → update field access
- New required fields → provide defaults or mark optional
- Changed enum values → update enum references

### Oathkeeper strips headers
Check `trust_forwarded_headers: true` is set in `.build/ory/oathkeeper/oathkeeper.yml` under `serve.proxy`.
Check `forward_http_headers` lists are present on both `bearer_token` and `cookie_session` authenticators.

### Login fails with "session_already_available" after email verification
Kratos v26.2.0 defaults the verification method to `code`, which auto-creates a session after successful verification. When the user is then redirected to `/login`, Kratos returns 400 because they're already logged in.
**Fix**: Ensure `selfservice.flows.verification.use: link` is set in `.build/ory/kratos/kratos.yml`.

### Kratos warns "Config version is 'v1.3.0' but kratos runs on version 'v26.2.0'"
Update the `version` field at the top of `.build/ory/kratos/kratos.yml` from `v1.3.0` to `v26.2.0`.

### 429 rate limit returns as 401
This is expected Oathkeeper v26.2.0 behavior. When Kratos returns 429 (rate limit), Oathkeeper maps it to 401. The server cannot distinguish this from a genuine auth failure. Document this for operators.
