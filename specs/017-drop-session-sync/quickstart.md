# Quickstart Notes (Post-Removal)

1. **Install & bootstrap**
   - `pnpm install`
   - `pnpm run start:services` if you need the dependency stack for smoke testing; unit tests do not require it.

2. **Verify removal state**
   - `rg "session-sync" -n src docs test` should return results only inside `specs/017-drop-session-sync/**`.
   - Inspect `src/app.module.ts` (or run `pnpm exec ts-node -e "console.log(require('./dist/app.module'))"` after build) to confirm no `SessionSyncModule` reference exists.

3. **Config sanity**
   - Examine `.env.docker`, `alkemio.yml`, and quickstart compose files to ensure `SESSION_SYNC_*`, `SYNAPSE_DB_*`, and `SYNAPSE_OIDC_PROVIDER_ID` are absent.

4. **Tests & build**
   - `pnpm lint`
   - `pnpm build`
   - Run the relevant Jest suites (e.g., `pnpm test:ci --runInBand --selectProjects unit`) to ensure no test imports the removed services.

5. **Smoke validation**
   - Start the API (`pnpm start:dev`) and confirm logs lack any "kratos-session-sync" messages or missing-config warnings.
   - Exercise a Synapse-backed feature (DM/discussion) to verify Synapse integrations continue working without the scheduler.
