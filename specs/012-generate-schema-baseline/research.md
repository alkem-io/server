# Research Summary: Automated Schema Baseline Generation

- **Decision**: Reuse `scripts/schema/generate-schema.snapshot.ts` to produce both `schema.graphql` and the committed `schema-baseline.graphql` during the post-merge run.
  - **Rationale**: The script already normalizes the schema with deterministic ordering and honors lightweight bootstrap toggles, guaranteeing contract-aligned output without duplicating logic.
  - **Alternatives considered**: Writing a dedicated baseline generator (adds code drift risk); relying on `schema.graphql` artifact from contract workflow runs (baseline could lag if snapshots are skipped).

- **Decision**: Import the signing key with `crazy-max/ghaction-import-gpg@v6` and sign the auto-commit using `git commit -S` with the repository `GITHUB_TOKEN`.
  - **Rationale**: The action handles armored keys and trust setup securely, while native GPG signing satisfies FR-004 without manual key management on runners.
  - **Alternatives considered**: Custom shell script to configure GPG (error-prone and harder to audit); GitHub App-based signing (requires new infrastructure outside current scope).

- **Decision**: Expose schema diffs via a generated job summary and uploaded artifact produced by a new helper (`scripts/schema/publish-baseline.ts`) that wraps `git diff --word-diff=color` for readability.
  - **Rationale**: Maintainers receive immediate visibility within the workflow UI, and artifacts retain full diff context for audit without requiring separate PRs.
  - **Alternatives considered**: Opening a follow-up PR for review (adds manual overhead for every merge); emailing diffs (inconsistent delivery and harder to audit).

- **Decision**: Notify owners on failures by posting a commit comment (via `actions/github-script@v7`) tagging repository CODEOWNERS and linking the failed run.
  - **Rationale**: GitHub notifications reach the responsible engineers automatically, meeting FR-006 without introducing external dependencies.
  - **Alternatives considered**: Slack webhook (needs extra secrets/integration); issue creation (risks alert fatigue for transient failures).

- **Decision**: Serialize runs with a workflow-level concurrency group (`schema-baseline-develop`) and include a `git pull --ff-only` guard before committing.
  - **Rationale**: Prevents conflicting pushes when multiple merges land close together and guarantees the commit is based on the latest `develop` tip.
  - **Alternatives considered**: Let concurrent jobs push sequentially (risking forced updates and rejected pushes); manually polling for new merges (adds latency and complexity).
