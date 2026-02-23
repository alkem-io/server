---
description: Acquire a Kratos session token for the pipeline service account (reads credentials from .claude/pipeline/.env)
---

Run the non-interactive login script to authenticate the pipeline service account against Kratos and store a session token. The script reads `PIPELINE_USER` and `PIPELINE_PASSWORD` from `.claude/pipeline/.env` and writes the token to `.claude/pipeline/.session-token`.

```bash
.scripts/non-interactive-login.sh
```

Report the result to the user. If it fails, show the error and suggest checking:
- That services are running (`pnpm run start:services`)
- That `.claude/pipeline/.env` has valid `PIPELINE_USER` and `PIPELINE_PASSWORD`
- That the user is registered (suggest `/register-user` if not)
