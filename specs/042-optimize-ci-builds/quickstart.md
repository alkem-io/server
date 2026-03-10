# Quickstart: Optimize CI Builds

## Verification Checklist

### After Implementation

1. **Push a commit to a PR branch** and verify:
   - [ ] Tests run exactly once (in the `test` job of `ci-tests.yml`)
   - [ ] Tests run WITH coverage (produces `coverage-ci/lcov.info`)
   - [ ] SonarQube job consumes coverage from the test job (no re-run)
   - [ ] Both jobs execute on Apple Silicon runner (check runner labels in logs)
   - [ ] `trigger-sonarqube.yml` no longer exists (no separate workflow triggered)
   - [ ] CI status checks report correctly (pass/fail)

2. **Push a second commit to the same PR** and verify:
   - [ ] pnpm dependency cache is restored (check "Cache restored" in logs)
   - [ ] Dependency install completes faster than first run

3. **Check schema contract workflow** on the same PR:
   - [ ] `schema-contract.yml` runs on Apple Silicon runner
   - [ ] Schema diff and gate evaluation complete successfully

4. **Check review-router workflow** on the same PR:
   - [ ] `review-router.yml` runs on Apple Silicon runner
   - [ ] PR metrics computed correctly

5. **Merge to develop** and verify:
   - [ ] `schema-baseline.yml` runs on Apple Silicon runner
   - [ ] CI tests run on push trigger

6. **Create a release** and verify:
   - [ ] Only one Docker build-and-push workflow triggers
   - [ ] The workflow is named `build-release-docker-hub.yml` (the sole Docker release workflow)
   - [ ] Docker image is built and pushed with correct tags
   - [ ] Image is built on `ubuntu-latest` (not Apple Silicon)

### Rollback Plan

If issues arise with Apple Silicon runners:
1. Revert the runner label changes (`[self-hosted, macOS, ARM64, apple-silicon, m4]` → `arc-runner-set`)
2. The SonarQube Docker action replacement may need to stay (if `arc-runner-set` also moves to macOS)

If SonarQube scan/quality-gate actions fail on macOS:
1. Both actions are Node.js/composite (not Docker) and should work on macOS natively
2. If issues arise, fall back to direct SonarScanner CLI invocation via `npx sonarqube-scanner`

## Key Files Modified

| File | Change |
|------|--------|
| `.github/workflows/ci-tests.yml` | Unified test + SonarQube, caching, Apple Silicon runner |
| `.github/workflows/trigger-sonarqube.yml` | DONE: Deleted (merged into ci-tests.yml) |
| `.github/workflows/build-release-docker-hub.yml` | DONE: Sole remaining Docker release workflow (legacy deleted, `-new` variant renamed here) |
| `.github/workflows/schema-contract.yml` | Runner migration to Apple Silicon |
| `.github/workflows/schema-baseline.yml` | Runner migration to Apple Silicon |
| `.github/workflows/review-router.yml` | Runner migration to Apple Silicon |
