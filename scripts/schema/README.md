# Schema Tooling Scripts

This directory houses implementation scripts for Feature 002 (Schema Contract Diffing & Enforcement).

Planned scripts:

- generate-schema.snapshot.ts: Produce deterministic GraphQL SDL snapshot (`schema.graphql`).
- diff-schema.ts: Compare current generated SDL vs committed snapshot; emit `change-report.json` & `deprecation-registry.json`.
- schema-gate.ts: Apply governance exit codes (blocking on unapproved BREAKING / PREMATURE_REMOVAL / INVALID_DEPRECATION_FORMAT).
- post-pr-comment.ts: (Optional) Summarize counts in PR comment.

Policy:

- Only `schema.graphql` is committed. Reports are ephemeral (see plan.md Snapshot & Artifact Path Policy).
