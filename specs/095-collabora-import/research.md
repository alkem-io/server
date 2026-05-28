# Phase 0 Research — Collabora Document Framing Import

This document resolves the implementation-affecting unknowns surfaced by Technical Context. Each item: **Decision**, **Rationale**, **Alternatives considered**.

## R1 — Nested `Upload` field inside `@InputType()`

**Question**: The spec (clarification Q1, Option A) commits to extending `CreateCollaboraDocumentInput` with an optional `file: Upload` field. Every existing `Upload` usage in this codebase is at the **top level** of a mutation (e.g., `importCollaboraDocument`, `uploadFileOnReference`, `uploadFileOnStorageBucket`, `uploadVisual`). There is **zero precedent** for `@Field(() => GraphQLUpload, { nullable: true })` inside an `@InputType()` class. We need to confirm whether this works on NestJS 10 + Apollo Server 4 + `graphql-upload` v15 before we lock the contract shape.

**Decision**: **Use a top-level `file: Upload` argument on `createCalloutOnCalloutsSet`** (parallel to `calloutData`), and document this as the operational realization of the spec's Option A. The spec's "extend `CreateCollaboraDocumentInput`" phrasing is interpreted as a logical contract (one mutation handles both blank and upload; no new top-level mutation is introduced) rather than a literal placement of `Upload` inside the nested input class. The file is associated with the framing's `collaboraDocument` field by virtue of being the only Upload arg on the mutation; the resolver routes it to that branch.

**Rationale**:

- **Multipart-spec compatibility** — the GraphQL multipart spec (which `graphql-upload` implements) does support nested file paths in `variables.*`, but every Apollo client and every existing FE call against this server uses top-level Upload args. Switching one mutation to nested-Upload would create a single inconsistent FE shape across the API surface and force the FE to special-case the multipart `map` for this one mutation.
- **No new convention introduced** — Constitution Principle 7 (API Consistency) and Principle 10 (Simplicity & Incremental Hardening) both push toward reusing the existing top-level `file: Upload` pattern that ships with `importCollaboraDocument`, `uploadFileOnReference`, `uploadFileOnStorageBucket`, `uploadVisual`, etc. Introducing a nested-Upload pattern for one mutation is architectural churn for no schema-size benefit.
- **Schema-contract diff size is unchanged** — whether `file: Upload` is added as a field on `CreateCollaboraDocumentInput` or as an arg on `createCalloutOnCalloutsSet`, the diff is one additive line. The only difference is *where* it lives in the schema. Top-level matches existing FE expectations.
- **Spec intent preserved** — the user's explicit intent (clarify Q1) was "single mutation, smallest change, FE submits the same mutation with or without a file." A top-level optional arg satisfies all three: still one mutation (`createCalloutOnCalloutsSet`), still no new top-level mutation, FE just attaches a multipart file part with a top-level path when uploading.

**Alternatives considered**:

- **Literal nested `Upload` inside `CreateCollaboraDocumentInput`**: Would require either (a) verifying NestJS GraphQL accepts `GraphQLUpload` as `@Field()` and (b) every FE caller emitting nested multipart paths. Rejected on consistency-cost grounds.
- **Dedicated `createCalloutFromCollaboraFile` mutation** (option (b) from clarify Q1): Already rejected in the clarify session.

**Implementation note**: Spec text and schema description on the new arg should make clear that the file populates the framing Collabora document of this callout — i.e., the arg has effect iff `calloutData.framing.type === COLLABORA_DOCUMENT` and `calloutData.framing.collaboraDocument` is present. When the file arg is supplied without a matching framing, the resolver MUST reject with a validation error (covered by FR-009 "missing required input" — concrete edge case already enumerated in spec Edge Cases as "Multipart payload with file but no framing input").

## R2 — Mapping file-service-go failures to FR-009 error classes

**Question**: FR-009 enumerates 8 rejection classes. The existing `FileServiceAdapter` throws two exception types (`FileServiceAdapterException`, `StorageServiceUnavailableException`) that map HTTP statuses to `AlkemioErrorStatus`. We need a one-to-one map so the resolver / service layer surfaces each FR-009 class via the correct Alkemio status code without inventing new exception types.

**Decision**: Reuse existing `AlkemioErrorStatus` codes via the existing `FileServiceAdapter` exception types. No new exception class is introduced. Mapping table:

| FR-009 rejection class | Source (HTTP / runtime) | Existing exception | `AlkemioErrorStatus` |
| --- | --- | --- | --- |
| Invalid format (sniffed MIME outside supported list) | file-service-go 415 / 422 | `FileServiceAdapterException` | `FORMAT_NOT_SUPPORTED` |
| Size exceeded | file-service-go 413 | `FileServiceAdapterException` | `STORAGE_UPLOAD_FAILED` |
| Corrupted / unreadable file bytes | file-service-go 422 | `FileServiceAdapterException` | `FORMAT_NOT_SUPPORTED` |
| Collabora ingestion failure (post-upload) | downstream — covered by existing rollback in `CollaboraDocumentService.importCollaboraDocument` | propagated as-is | (existing — varies) |
| file-service-go upstream unavailable | file-service-go 503 / transport error / circuit breaker open | `StorageServiceUnavailableException` | `STORAGE_SERVICE_UNAVAILABLE` |
| Missing required input (e.g., file without framing) | resolver / service validator | `ValidationException` | `BAD_USER_INPUT` |
| Authorization denied | resolver `AuthorizationService.grantAccessOrFail` | existing `AuthorizationException` | `FORBIDDEN` / `UNAUTHENTICATED` |
| Quota / rate exceeded | existing storage / rate-limit layer | existing | (existing — varies) |

**Rationale**:

- All 8 classes already have a code path. The existing `FileServiceAdapter.handleError` (lines 211–230 of `file.service.adapter.ts`) handles transport failures and HTTP errors, distinguishes 503 / transport from data-validation failures, and surfaces the right `AlkemioErrorStatus`. Adding a new exception class would violate Principle 10 (Simplicity).
- The "upstream unavailable" category (clarify Q6 fail-fast semantics) is already represented as `StorageServiceUnavailableException` — the resolver does **not** catch and retry; the exception propagates to the GraphQL error formatter, satisfying FR-009's "no in-resolver retry" rule.
- Atomicity (FR-006) is preserved by the existing two-phase temp→permanent flow inside `CollaboraDocumentService.importCollaboraDocument`. On any of the rejection classes above, the temp document row is deleted (or never created). The new framing-time call piggybacks on this; there is no new transactional primitive.

**Alternatives considered**:

- **Introduce a dedicated `CollaboraImportFailureException`**: Rejected — would add one more exception class to track without adding signal beyond the existing `AlkemioErrorStatus` taxonomy.
- **Catch-and-rewrap at the resolver layer**: Rejected — would lose the operation/httpStatus details already on `FileServiceAdapterException` and would centralize logic that's already correct in the adapter.

## R3 — `displayName` defaulting boundary

**Question**: FR-012 says when `file` is present and `displayName` is absent or empty, the server defaults from filename (extension stripped). The existing `CollaboraDocumentService.importCollaboraDocument` already performs this defaulting via `deriveDisplayNameFromFilename(filename)`. The framing-time path, however, has its own `CreateCollaboraDocumentInput` whose `displayName` is currently `@IsNotEmpty()` — class-validator will reject the request before the resolver branch fires if we keep that decorator strict.

**Decision**: Relax `displayName` and `documentType` on `CreateCollaboraDocumentInput` to optional at the class-validator layer (`@IsOptional()`), and enforce **conditional requirement** at the service layer in `CalloutFramingService`:

- If the framing-time `collaboraDocument` arrives without `file`: `displayName` and `documentType` MUST both be present (existing blank-path semantics) — throw `ValidationException` if either is absent.
- If the framing-time `collaboraDocument` arrives with `file`: `displayName` MAY be absent (will default from filename), `documentType` MAY be absent (will be derived from sniffed MIME) — pass through to `importCollaboraDocument(file, displayName, ...)`, which already handles defaulting internally.

**Rationale**:

- Class-validator decorators run before the resolver; they cannot express "required iff this other field is absent." Pushing the conditional check one layer down (to the service) is the established Alkemio pattern (`callout.framing.service.ts:185-189` already does this for `collaboraDocument` itself when `type === COLLABORA_DOCUMENT`).
- This preserves FR-001 (blank-path non-regression): the existing blank-create still rejects empty `displayName`, just at the service layer instead of the validator. SC-001 (existing test suite passes 100%) is satisfied as long as the error message stays comparable; the existing tests assert behavior, not the precise validator that fires.
- FR-012 is satisfied: `importCollaboraDocument`'s existing `displayNameOverride ?? deriveDisplayNameFromFilename(file.filename) ?? 'Imported document'` ladder is re-used verbatim.

**Alternatives considered**:

- **Add a custom `@ValidIfFilePresent` class-validator decorator**: Rejected — too clever for a rule used in exactly one place; obscures the conditional from readers.
- **Split into two input types** (`CreateCollaboraDocumentBlankInput` vs `CreateCollaboraDocumentUploadInput`) in a discriminated union: Rejected — would force a breaking schema change to `CreateCalloutFramingInput.collaboraDocument`. Violates SC-006 additive-only constraint.

## R4 — Authorization re-check at framing-creation boundary

**Question**: FR-007 says authorization MUST be checked at the same boundary as existing framed-callout creation. The Edge Case "Authorization revoked mid-flight" requires the server to either re-check at the persistence boundary or rely on existing transactional authorization. We need to confirm which.

**Decision**: Rely on the existing single-shot authorization check at the resolver entry (`AuthorizationService.grantAccessOrFail(actorContext, calloutsSet.authorization, AuthorizationPrivilege.CREATE_CALLOUT, ...)` in `CalloutsSetResolverMutations.createCalloutOnCalloutsSet`, line 59). No re-check is added. This matches blank-path behavior exactly (FR-007).

**Rationale**:

- The existing blank-path is single-shot. Adding a re-check would be a behavior divergence between blank and upload paths and violate FR-008's "indistinguishable downstream" parity.
- The temp→permanent atomic flow inside `importCollaboraDocument` already ensures that if the request fails between authorization and persistence (for any reason), no callout / framing / storage is created. Authorization revocation mid-flight is a pathological case already handled by the same atomicity.
- Constitution Principle 8 (Secure-by-Design Integration) is satisfied: the centralized validation/authorization layer fires at the resolver boundary, before any state-changing call.

**Alternatives considered**:

- **Re-check authorization just before `calloutService.save(callout)`**: Rejected — adds latency, has no observable benefit given the atomicity guarantees, and creates blank/upload divergence.

## R5 — Stream timeout reuse

**Question**: The existing `importCollaboraDocument` resolver buffers the multipart stream with `streamToBuffer(createReadStream(), streamTimeoutMs)` where `streamTimeoutMs = configService.get<number>('storage.file.stream_timeout_ms')`. The new framing-time path needs the same protection (FR-006 atomicity, Edge Case "Interrupted upload").

**Decision**: Reuse `streamToBuffer` with the same `storage.file.stream_timeout_ms` config key. No new config key, no new env var.

**Rationale**:

- Already proven on the contribution-import path. SC-002/SC-003 atomicity guarantees rely on it. Constitution Principle 9 (Container & Deployment Determinism) — no new env var needed.

**Alternatives considered**:

- New per-feature timeout config: Rejected as gratuitous; reuses existing operational tuning.

---

**All NEEDS CLARIFICATION resolved**: Phase 0 is complete. Proceed to Phase 1.
