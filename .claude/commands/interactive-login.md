---
description: Acquire a Kratos session COOKIE (browser flow) for user-bound GQL flows. Use when the request needs full Oathkeeper session→JWT exchange — WOPI editor URL, anything hitting `@CurrentActor` privilege checks, audit-logged actions, etc.
---

Run the interactive login script to authenticate via Kratos's browser self-service flow and store the resulting `ory_kratos_session` cookie. The script reads `PIPELINE_USER` and `PIPELINE_PASSWORD` from `.claude/pipeline/.env` and writes the cookie jar to `.claude/pipeline/.cookie-jar`.

```bash
.scripts/interactive-login.sh
```

Report the result to the user. If it fails, show the error and suggest checking:
- That services are running (`pnpm run start:services`)
- That `.claude/pipeline/.env` has valid `PIPELINE_USER` and `PIPELINE_PASSWORD`
- That the user is registered (suggest `/register-user` if not)

After login, queries are made via `.scripts/gql-request-interactive.sh` — same `/tmp/.gql-query` + optional variables file pattern as the non-interactive variant, but auth flows through the browser endpoint with the cookie.
