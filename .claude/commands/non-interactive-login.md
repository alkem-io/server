---
description: Acquire a Hydra-issued JWT for the pipeline service account via OAuth2+PKCE (reads credentials from .claude/pipeline/.env)
---

Run the non-interactive login script to authenticate the pipeline service account and store a Bearer token for the GQL pipeline. The script reads `PIPELINE_USER` and `PIPELINE_PASSWORD` from `.claude/pipeline/.env` and writes the token to `.claude/pipeline/.session-token`.

```bash
.scripts/non-interactive-login.sh
```

## What it does (post-Oathkeeper / OIDC rework)

Ory Oathkeeper has been retired. The server's GraphQL endpoints no longer accept a raw Kratos `session_token` as a Bearer — that now fails with `ERR_JWS_INVALID`. They validate a **Hydra-issued JWT (JWS)** signed against the platform JWKS, whose `aud` must be in the server's `BEARER_AUD_ALLOW_LIST`.

There is no transparent session→JWT edge at the gateway anymore, so the script runs the full OAuth2 **Authorization Code + PKCE** flow itself (see `oidc_login_jwt` in `.scripts/lib/kratos.sh`):

1. **Kratos browser login** — submits credentials, captures the `ory_kratos_session` cookie.
2. **OAuth2 authorize** (`/oauth2/auth`) with the `alkemio-web` public client, `audience=alkemio-web`, and a PKCE challenge — following the redirects through the `oidc-service` login + consent hops.
3. **Token exchange** (`/oauth2/token`) of the authorization code (PKCE verifier, no client secret) for the access-token JWT.

The resulting JWT is **actor-bound** (carries `alkemio_actor_id`) and is accepted on **both** the interactive (`/api/private/graphql`) and non-interactive (`/api/private/non-interactive/graphql`) endpoints. It expires (~1h) — re-run to refresh.

OIDC endpoints/client default to the local `alkemio-web` setup and match server `alkemio.yml`; override via `OIDC_AUTH_ENDPOINT`, `OIDC_TOKEN_ENDPOINT`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_AUDIENCE`, `OIDC_SCOPE`, `OIDC_BASE_URL` for other environments.

Report the result to the user. If it fails, show the error and suggest checking:
- That services are running (`pnpm run start:services`)
- That `.claude/pipeline/.env` has valid `PIPELINE_USER` and `PIPELINE_PASSWORD` (a `4000006 / invalid credentials` error means the password is wrong or the account isn't registered)
- That the user is registered (suggest `/register-user` if not)
- That the `alkemio-web` OAuth2 client and `oidc-service` are up (the flow needs `/oauth2/auth`, `/oauth2/token`, and `/oidc/login` + `/oidc/consent` reachable on the gateway)
