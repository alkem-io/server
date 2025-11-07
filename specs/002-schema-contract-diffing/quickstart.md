# Quickstart: GraphQL Schema Contract Diffing & Enforcement

Feature: 002-schema-contract-diffing
Status: Active (implementation merged on feature branch)
Audience: Contributors & CI Maintainers

## Goal

Provide a concise workflow to generate a schema snapshot, run a diff against the last committed snapshot, and interpret classification results before pushing a PR.

## Prerequisites

- Node.js environment with project dependencies installed.
- Access to base branch containing latest accepted snapshot (develop).
- Git working tree clean or intentional staged changes only.

## Workflow Steps

### 1. Generate Current Candidate Schema Snapshot

The printer boots the NestJS GraphQL module and emits a deterministic SDL, then (optionally) enforces canonical ordering.

```
npm run schema:print
npm run schema:sort   # only needed if printer order drift suspected; harmless otherwise
```

Result: `schema.graphql` created/overwritten.

### 2. Retrieve Previous Snapshot

```
# If snapshot committed at ./schema.graphql on base branch
git show origin/develop:schema.graphql > tmp/prev.schema.graphql || echo "" > tmp/prev.schema.graphql
```

If file empty ⇒ baseline creation scenario.

### 3. Run Diff Tool

Ensure previous snapshot prepared first (Step 2).

```
npm run schema:diff
```

Outputs (generated in repo root by default):

- `change-report.json`: classified changes with counts (includes `baseline`), per-entry override markers (`override: true`), grace metadata (`grace`, `graceExpiresAt`), scalar evaluations.
- `deprecations.json`: active + scheduled deprecations registry (excludes grace-only entries) including retirement metadata when applicable (`retired`, `retirementDate`).

### 4. Interpret Classification

| Situation                                  | Action                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| BREAKING entries present                   | Refactor OR supply valid CODEOWNER review containing `BREAKING-APPROVED` (override sets per-entry `override: true`). |
| PREMATURE_REMOVAL present                  | Restore removed enum value(s) until lifecycle satisfied OR secure override if intentionally early.                   |
| INVALID_DEPRECATION_FORMAT present         | Fix annotation reason string to match `REMOVE_AFTER=YYYY-MM-DD                                                       | reason` (post-grace).          |
| DEPRECATION_GRACE present                  | Newly added deprecation missing schedule; add `REMOVE_AFTER=YYYY-MM-DD                                               | reason`before`graceExpiresAt`. |
| Only ADDITIVE / DEPRECATED / INFO          | Safe to proceed.                                                                                                     |
| INFO entries only for widening nullability | Widening considered non-breaking; verify no client impact.                                                           |
| BASELINE (no prior snapshot)               | Commit new snapshot.                                                                                                 |

### 5. Local Verification / Contract Validation

Run the provided validation script (Ajv under the hood):

```
npm run schema:validate
```

This validates both artifacts against their JSON Schemas. (Advanced) To validate individually with Ajv CLI:

```
npx ajv validate -s specs/002-schema-contract-diffing/contracts/change-report.schema.json -d change-report.json
npx ajv validate -s specs/002-schema-contract-diffing/contracts/deprecation-registry.schema.json -d deprecations.json
```

### 6. Commit Artifacts

Commit updated `schema.graphql` plus any tooling changes. Do **NOT** commit `change-report.json` or `deprecations.json`; CI regenerates them deterministically. (Temporary inclusion for discussion is acceptable but should be dropped before merge.)

```
git add schema.graphql
git commit -m "chore(schema): update snapshot after field additions"
```

### 7. Open Pull Request

- Include summary counts from `change-report.json` in PR description.
- If intentional breaking change, describe rationale and wait for CODEOWNER approval containing `BREAKING-APPROVED`.
- CI (`schema-contract.yml`) will:
  1.  Re-generate & sort schema
  2.  Re-run diff & validation
  3.  Post/update a sticky PR comment summarizing counts
  4.  Fail if unapproved BREAKING / PREMATURE_REMOVAL / INVALID_DEPRECATION_FORMAT.

## Example PR Description Snippet

```
Schema Diff Summary:
- Additive: 3
- Deprecated: 1 (field Foo.bar REMOVE_AFTER=2026-01-10)
- Breaking: 0
- Premature Removals: 0
- Invalid Deprecations: 0
```

## Troubleshooting

| Issue                               | Cause                                                        | Fix                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All changes flagged due to ordering | Non-deterministic print (rare drift)                         | Run `npm run schema:sort` then re-run diff                                                                                                                                                                             |
| Enum removal blocked                | 90-day window incomplete OR removeAfter date not reached     | Revert enum value; wait until both removeAfter passed AND >=90 days since deprecation                                                                                                                                  |
| Override ignored                    | Review JSON missing / reviewer not CODEOWNER / phrase absent | Ensure reviewer listed in CODEOWNERS and body contains `BREAKING-APPROVED`; in CI re-submit an approval after the latest push and re-run the job; for local simulation export SCHEMA_OVERRIDE_REVIEWS_JSON before diff |
| Invalid deprecation format          | Reason string missing `REMOVE_AFTER=YYYY-MM-DD` prefix       | Amend directive reason with full format `REMOVE_AFTER=YYYY-MM-DD \| rationale`                                                                                                                                         |
| Deprecation grace warning           | Newly deprecated element missing schedule (<24h)             | Add schedule before graceExpiresAt to avoid escalation                                                                                                                                                                 |
| Premature removal                   | Attempted removal before removeAfter or <90 days elapsed     | Restore element until lifecycle satisfied                                                                                                                                                                              |
| Unexpected BREAKING on type change  | Nullable ↔ non-null change or scalar jsonType change        | Re-evaluate change necessity or apply override approval                                                                                                                                                                |
| Gate exit code 1                    | Unapproved BREAKING entries present                          | Secure override or refactor change to non-breaking pattern                                                                                                                                                             |
| Gate exit code 2                    | PREMATURE_REMOVAL entries present                            | Re-add prematurely removed items; wait lifecycle window                                                                                                                                                                |
| Gate exit code 3                    | INVALID_DEPRECATION_FORMAT entries present                   | Fix reason format & re-run diff                                                                                                                                                                                        |

### Debugging Parity Failures

If `schema.parity.spec.ts` fails:

1. Capture both emitted SDLs (printed in test output snippet).
2. Look for ordering-only differences: run `npm run schema:sort` and re-run tests.
3. Identify missing type in lightweight bootstrap: import its module (or extract its GraphQL-only submodule) into `SchemaBootstrapModule`.
4. Avoid adding heavy infra modules; instead create or extend a stub provider under `schema-bootstrap/stubs`.

### Override Simulation Tips

If overrides not applying locally, echo the parsed reviews to confirm ingestion:

```
echo $SCHEMA_OVERRIDE_REVIEWS_JSON | jq '.'
```

Ensure the JSON array objects include fields: reviewer, body (with phrase), state=APPROVED.

## Classification Glossary

| Classification             | Meaning                                                                       | Gate Effect                                                             |
| -------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------- |
| ADDITIVE                   | New type/field/enum value (non-breaking)                                      | Allowed                                                                 |
| DEPRECATED                 | Properly scheduled deprecation (has REMOVE_AFTER)                             | Allowed                                                                 |
| DEPRECATION_GRACE          | Newly deprecated without schedule (<24h window). Add `REMOVE_AFTER=YYYY-MM-DD | reason` within grace to avoid escalation to INVALID_DEPRECATION_FORMAT. | Allowed (warning) |
| INVALID_DEPRECATION_FORMAT | Deprecation reason missing or malformed schedule after grace                  | Fails gate                                                              |
| BREAKING                   | Removal / type change / incompatible scalar jsonType change                   | Fails gate unless override applied                                      |
| PREMATURE_REMOVAL          | Attempted removal before REMOVE_AFTER date or enum lifecycle window           | Fails gate                                                              |
| INFO                       | Benign metadata changes (description, non-jsonType scalar detail, etc.)       | Allowed                                                                 |
| BASELINE                   | Initial snapshot creation (no prior)                                          | Allowed                                                                 |

`overrideApplied: true` on the report indicates governance approval (phrase + CODEOWNER review). Each BREAKING or PREMATURE_REMOVAL entry approved will also include `"override": true`.

## Security & Compliance Notes

- No production data accessed by tool.
- Only Git snapshot & PR metadata read.
- Approval phrase acts as explicit governance marker (auditable).

---

Prepared by: Spec automation agent (updated post-implementation)

## Override Simulation (FR-003)

Locally you can simulate an approved override without calling GitHub API:

1. Ensure a `CODEOWNERS` file exists (or point `SCHEMA_OVERRIDE_CODEOWNERS_PATH`). Example:

```
* @alice @org/team
```

2. Export review JSON (single or multiple):

```
export SCHEMA_OVERRIDE_REVIEWS_JSON='[{"reviewer":"alice","body":"Looks good BREAKING-APPROVED","state":"APPROVED"}]'
```

3. Run the diff:

```
npm run schema:diff
```

4. Inspect `change-report.json`: `overrideApplied` should be true and BREAKING & PREMATURE_REMOVAL entries will have `"override": true`.

## Performance Verification (FR-026)

Run large synthetic diff performance test (<5s budget):

```
npm run test -- test/schema-contract/perf/large-schema.spec.ts
```

Expected: elapsed time logged (<5000ms). If over budget, profile diff engine (types/enums/scalars traversal) & consider caching.

## Retirement Metadata (FR-029)

When a deprecated element is removed after both conditions are satisfied (current date >= REMOVE_AFTER AND ≥90 days since `sinceDate`):

- Change entry classified as INFO.
- Corresponding registry entry sets `retired: true` & `retirementDate` (YYYY-MM-DD).

Verify via diff scenario or enum lifecycle test (`enum-lifecycle.spec.ts`).

## Unknown Scalar Inference (FR-027)

If scalar JSON type cannot be inferred (no directive, no naming heuristic match), entry appears with `current.jsonType: "unknown"` and scalar evaluation classification NON_BREAKING. Add explicit directive later to refine classification if needed.

Environment Variables:

- `SCHEMA_OVERRIDE_CODEOWNERS_PATH` (optional path to CODEOWNERS)
- `SCHEMA_OVERRIDE_REVIEWS_JSON` (inline JSON array of reviews)
- `SCHEMA_OVERRIDE_REVIEWS_FILE` (alternative file path with JSON array)

Limitations:

- Team slug expansion not implemented (treats `org/team` as literal owner token).
- CI workflow populates reviews via the GitHub Script step, saving to `tmp/schema-override-reviews.json`; local runs still need to provide JSON manually if simulating overrides.

## Grace Period (FR-014)

When a field or enum value is first deprecated without supplying a full reason string containing `REMOVE_AFTER=YYYY-MM-DD | ...`, the system:

- Emits a warning (classification: `DEPRECATION_GRACE`).
- Adds `grace: true` and `graceExpiresAt` fields to the corresponding change entry in `change-report.json`.
- Does NOT add the element to `deprecations.json` yet (pending valid schedule).

If the removal schedule isn't added before `graceExpiresAt`, the next diff run will classify it as `INVALID_DEPRECATION_FORMAT` (failing the gate). Always follow up within 24h to formalize the removal timeline.
