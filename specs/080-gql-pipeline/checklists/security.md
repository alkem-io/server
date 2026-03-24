# Security Checklist: GQL Validation & Fix Pipeline

**Purpose**: Validate that authentication, credential handling, and cross-repo access patterns are secure.
**Created**: 2026-03-18
**Feature**: [specs/080-gql-pipeline/spec.md](../spec.md)

## Credential Management

- [x] CHK001 Pipeline credentials (PIPELINE_USER, PIPELINE_PASSWORD) stored in `.claude/pipeline/.env` which is gitignored and not committed to the repository.
- [x] CHK002 Session token stored in `.claude/pipeline/.session-token` with `chmod 600` permissions, gitignored.
- [x] CHK003 Kratos login uses native API flow (not browser-based), scoped to local development only.

## Cross-Repository Access

- [x] CHK004 Fix PRs opened via `gh` CLI which uses the developer's existing GitHub authentication — no additional tokens stored.
- [x] CHK005 Fixer only modifies `.graphql` files — reviewer rejects PRs that touch non-GQL files as a safety gate.
- [x] CHK006 Reviewer enforces max 5 files changed per PR to prevent scope creep.
- [x] CHK007 Fix branches follow naming convention `fix/gql-{QueryName}` for auditability.

## Pipeline State

- [x] CHK008 All pipeline state files (results, fixes, reviews, benchmarks) are gitignored — no risk of leaking query results or credentials.
- [x] CHK009 Pipeline state is local-only — no data sent to external services beyond GraphQL queries to the local server and GitHub PRs.

## Session Security

- [x] CHK010 Scripts detect 401 responses and fail with clear messages rather than continuing with expired tokens.
- [x] CHK011 Session token is re-acquired automatically when expired (bench-validate.sh, live-validate.sh).
- [x] CHK012 Request timeout (15s) prevents hanging connections from consuming resources.

## Scope Limitations

- [ ] CHK013 Pipeline currently runs only in local development — no CI/CD integration. If extended to CI, credentials must move to GitHub Secrets.
- [ ] CHK014 Reviewer auto-merge trusts the fixer agent's changes — if extended to untrusted sources, human review should be required.

## Notes

- CHK013 and CHK014 are intentionally incomplete — they document known limitations for future hardening, not current gaps.
