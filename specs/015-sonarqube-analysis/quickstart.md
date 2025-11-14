# Quickstart: SonarQube Static Analysis for PRs

## Purpose

Enable SonarQube static analysis for every pull request on this repository and make the quality gate status visible to developers and release managers without hard-blocking merges.

## Developer Workflow

1. Open a pull request against the default branch.
2. Wait for the CI pipeline to complete.
3. Check the PR checks/status section for the SonarQube analysis result.
4. If the quality gate fails, use the link in the check to open the SonarQube dashboard and review issues.

## Operational Notes

- SonarQube runs are advisory only and do **not** block merges, but failed gates should be addressed or consciously accepted during release.
- Tokens and project keys are stored in the CI secrets manager and are not committed to this repository.
- If SonarQube is unreachable or misconfigured, the CI job fails with a clear error message and a suggested remediation.

## Maintenance

- When rotating SonarQube tokens, update the CI secrets and trigger a test PR to confirm analysis still succeeds.
- Quality gate thresholds are managed in SonarQube; adjust them there rather than editing CI scripts.
