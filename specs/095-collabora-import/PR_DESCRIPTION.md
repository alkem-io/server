# Collabora document on callout framing — extend `createCalloutOnCalloutsSet` to accept file upload (P1 Collections)

## Summary

Extends the existing `createCalloutOnCalloutsSet` mutation so authors can frame a callout with a Collabora document either by picking a type (existing blank path, unchanged) **or** by uploading an office file (new). Single mutation, two modes; no new top-level mutation; no migration.

Sibling FE ticket: alkem-io/client-web#9629.

## Domain impact

`collaboration` — specifically callout framing creation, callouts-set mutation, collabora-document service.

## What changed

### GraphQL contract (additive only)

- `Mutation.createCalloutOnCalloutsSet` gains an optional `file: Upload` argument.
- `CreateCollaboraDocumentData.displayName` and `documentType` are now optional on the input (they remain effectively required on the blank path; the conditional is enforced at the service layer).
- See `specs/095-collabora-import/contracts/schema.delta.graphql` for the full diff.

### Internal refactor (DRY)

`CollaboraDocumentService.createCollaboraDocument` is now a single entry point that handles both blank and upload modes (dispatched on `input.uploadedFile` presence). The previous `importCollaboraDocument` method is removed; its sole caller (`CalloutService.importCollaboraDocumentToCallout`) now calls the unified method directly. Profile + tagset + auth wiring + file-row staging is shared; the few mode-specific differences (canonical MIME for blank vs sniff for upload, `temporaryLocation: false` for blank vs `true → finalize` for upload) are parameterised.

This refactor also fixes a pre-existing leak: tagset-creation failure mid-build now rolls back the just-created profile (both old methods would have orphaned it).

### Resolver

`createCalloutOnCalloutsSet` accepts the optional `file: Upload`; when present, it buffers the stream via `streamToBuffer` (with the existing `storage.file.stream_timeout_ms` cap) and plumbs the bytes onto the input's transient `uploadedFile` field. Pre-buffer guards reject the request before any upload attempt if `file` is supplied without a `COLLABORA_DOCUMENT` framing.

### Behavioural details

- Authorization unchanged — same `CREATE_CALLOUT` privilege as any other framed callout.
- file-service-go is the sole MIME / format / size gatekeeper; the server does not maintain a parallel allowlist. Sniffed MIME wins; any `documentType` in the input is ignored on the upload path.
- `displayName` defaults from the uploaded filename (extension stripped) when input is **absent or empty** (the old `importCollaboraDocument` used `??` and would have kept an empty string — minor behavioural change, aligns with FR-012).
- `STORAGE_SERVICE_UNAVAILABLE` (file-service-go transient failures) propagate fail-fast — no in-resolver retry.
- Atomicity preserved across all failure modes: no orphan rows or storage objects.

## Schema changes

Verified via `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`. The `change-report.json` against the develop-baseline shows:

- **20 additive** entries (most of them inherited from the upstream collabora PRs already on `release/55`).
- **1 info** entry — `Mutation.createCalloutOnCalloutsSet` description changed (this PR's contribution).
- **0 breaking** — SC-006 satisfied. No `BREAKING-APPROVED` required.

The branch-specific additive bits (input-field optionality + new optional argument) are correctly emitted in `schema.graphql` and reviewed in the schema-contract workflow.

## Migration

**None.** No DB schema changes; the framing Collabora document entity carries no new columns. Origin (blank vs upload) and original filename are not persisted (per spec clarification Q4).

## Deprecations

**None.**

## Tests

- **Unit** — added blank/upload branch coverage in `callout.framing.service.spec.ts` and `callouts.set.resolver.mutations.spec.ts`. Covers both the resolver pre-buffer guards and the service-layer dispatch.
- **Integration** — new file `test/integration/callout-collabora-framing-upload/callout-collabora-framing-upload.spec.ts` (8 tests) exercising the resolver→service wiring with mocked file-service-go: stage call shape, sniff-driven type derivation, displayName defaulting on empty input, atomicity (profile-fail → file rollback; finalize-fail → both rollback), `STORAGE_SERVICE_UNAVAILABLE` fail-fast, and blank-path non-regression.
- **Full suite**: 6,418 passing / 7 skipped / 0 failing.
- **Type-check**: `tsc --noEmit` exits 0.
- **Lint**: `pnpm lint` clean (only pre-existing unrelated warnings).

The full live-DB / live-file-service-go / live-Kratos integration runs (atomicity audits over real storage, latency parity SC-004, downstream-event parity SC-005) require the dev stack and should be exercised via `quickstart.md` before merge or in a dedicated CI lane.

## Risk

- **Blank-path non-regression**: existing `createCalloutOnCalloutsSet` blank-create (PR #5970 / `specs/086-collabora-integration`) is preserved verbatim at the contract level; integration spec covers the call-shape parity.
- **Internal refactor**: `CollaboraDocumentService.importCollaboraDocument` is removed; one internal caller updated. The top-level GraphQL mutation `importCollaboraDocument` (consumed by alkem-io/client-web#9620) keeps the same wire contract — only the internal method name changed.
- **Empty-string `displayName` on upload**: now correctly falls through to filename derivation (was kept as `''` by the old `??`). Caller-visible only if a caller deliberately passed empty strings, which is unlikely.

## References

- Spec: `specs/095-collabora-import/spec.md`
- Plan: `specs/095-collabora-import/plan.md`
- Schema delta: `specs/095-collabora-import/contracts/schema.delta.graphql`
- Quickstart (manual verification): `specs/095-collabora-import/quickstart.md`
- Sibling FE ticket: alkem-io/client-web#9629
- Sibling server work (contribution variant, already shipped): PR #5970 / `specs/087-collabora-import`
- Blank-create base (already in production): `specs/086-collabora-integration/spec.md`
