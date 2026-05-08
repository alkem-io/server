# Quickstart — Collabora Document Framing Import

How to exercise the new upload path locally once it is implemented. Use this to validate User Stories 1–4 manually before opening a PR.

## Prerequisites

```bash
pnpm install
pnpm run start:services           # Postgres 17.5, RabbitMQ, Kratos, Oathkeeper, file-service-go
pnpm run migration:run            # No new migration for this feature, but ensure prior migrations are applied
pnpm run start:dev                # Hot reload
```

GraphQL Playground: `http://localhost:4000/graphiql`. You will need a Kratos session cookie or pipeline JWT — use `/non-interactive-login` (pipeline) or `/interactive-login` (browser flow) per the project's auth conventions.

You also need:

- An existing calloutsSet ID where you have `CREATE_CALLOUT` privilege.
- A small DOCX, XLSX, or PPTX file (1–5 MB) to upload.

## Story 1 — Blank-create (existing, must remain unchanged)

```graphql
mutation CreateBlankCollaboraFraming($calloutData: CreateCalloutOnCalloutsSetInput!) {
  createCalloutOnCalloutsSet(calloutData: $calloutData) {
    id
    framing {
      type
      collaboraDocument {
        id
        documentType
        profile { id displayName }
      }
    }
  }
}
```

Variables:

```json
{
  "calloutData": {
    "calloutsSetID": "<calloutsSetID>",
    "framing": {
      "profile": { "displayName": "Q3 Plan" },
      "type": "COLLABORA_DOCUMENT",
      "collaboraDocument": {
        "displayName": "Q3 Plan",
        "documentType": "WORDPROCESSING"
      }
    },
    "settings": { /* default */ }
  }
}
```

Expected: a new callout with `framing.collaboraDocument.documentType = WORDPROCESSING` and an empty document openable in Collabora. Verifies SC-001 (blank path unchanged).

## Story 2 — Upload (new)

Use a multipart-aware client (Apollo `link-upload`, Insomnia, `curl`, or the Playground multipart panel). The mutation sends `file` at the top level of the operation.

```graphql
mutation CreateUploadedCollaboraFraming(
  $calloutData: CreateCalloutOnCalloutsSetInput!,
  $file: Upload!
) {
  createCalloutOnCalloutsSet(calloutData: $calloutData, file: $file) {
    id
    framing {
      type
      collaboraDocument {
        id
        documentType
        profile { id displayName }
      }
    }
  }
}
```

Variables (note: `displayName` and `documentType` are now optional on upload):

```json
{
  "calloutData": {
    "calloutsSetID": "<calloutsSetID>",
    "framing": {
      "profile": { "displayName": "Q3 Plan" },
      "type": "COLLABORA_DOCUMENT",
      "collaboraDocument": {}
    },
    "settings": { /* default */ }
  },
  "file": null
}
```

Plus a multipart `map` mapping `file` → `variables.file` and the file part itself.

`curl` example:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Cookie: ory_kratos_session=<session>" \
  -F operations='{"query":"mutation($calloutData: CreateCalloutOnCalloutsSetInput!, $file: Upload!){ createCalloutOnCalloutsSet(calloutData:$calloutData, file:$file){ id framing{ collaboraDocument{ id documentType profile{ displayName } } } } }","variables":{"calloutData":{"calloutsSetID":"<id>","framing":{"profile":{"displayName":"Q3 Plan"},"type":"COLLABORA_DOCUMENT","collaboraDocument":{}}},"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@./fixtures/q3-plan.docx
```

Expected: a new callout. Open the editor URL — the document opens with the contents of `q3-plan.docx`. `documentType` is `WORDPROCESSING` (derived from sniffed MIME). `profile.displayName` is `q3-plan` (default from filename, extension stripped).

## Story 3 — Rejection paths

Submit the same multipart request with each of the following, one at a time, and confirm the GraphQL response carries a structured error and the calloutsSet has no new callout:

| Test | File / input | Expected `AlkemioErrorStatus` |
| --- | --- | --- |
| Unsupported format | `report.pdf` | `FORMAT_NOT_SUPPORTED` |
| Misleading extension | `report.docx` containing `application/pdf` magic bytes | `FORMAT_NOT_SUPPORTED` |
| Oversize | a 200 MB DOCX (or whatever exceeds file-service-go's limit) | `STORAGE_UPLOAD_FAILED` |
| Empty file | a 0-byte file | `FORMAT_NOT_SUPPORTED` |
| File without framing | upload a DOCX but set `framing.type` to `NONE` (or omit `collaboraDocument`) | `BAD_USER_INPUT` |
| file-service-go down | `docker compose stop file-service-go`, then submit a valid upload | `STORAGE_SERVICE_UNAVAILABLE` |

After each, query the calloutsSet for callouts and confirm the count has not increased; query the storage bucket and confirm no new orphan rows.

## Story 4 — Parity check

Create one callout via Story 1 and one via Story 2 with the same `documentType` (e.g., both `WORDPROCESSING`). Compare:

- `Callout` response shape — must be byte-equivalent modulo `id`, timestamps, and document content.
- Editor URL behavior — open both, edit a character, save, reload. Behavior must match.
- Delete each callout and confirm the framing Collabora document and backing storage are released cleanly (no orphan rows, no orphan storage objects).

Verifies SC-005 (event parity is asserted by an integration test with subscriber capture; manual verification is best-effort).

## Schema-contract verification

After the implementation lands, run:

```bash
pnpm run schema:print && pnpm run schema:sort
pnpm run schema:diff
```

Inspect `change-report.json`. The expected diff is:

- `CreateCollaboraDocumentData.displayName: String! → String` (additive, optional-ization on input)
- `CreateCollaboraDocumentData.documentType: CollaboraDocumentType! → CollaboraDocumentType` (additive)
- `Mutation.createCalloutOnCalloutsSet` adds optional argument `file: Upload` (additive)

No BREAKING entries. SC-006 satisfied.

## Test commands

```bash
# Unit tests touching the modified files
pnpm test -- src/domain/collaboration/callout-framing/callout.framing.service.spec.ts
pnpm test -- src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.spec.ts
pnpm test -- src/domain/collaboration/collabora-document/collabora.document.service.spec.ts

# Integration test for the new path
pnpm test -- test/integration/collabora-document-framing-import.it-spec.ts

# Full CI suite
pnpm test:ci:no:coverage
```

## Rollback

No DB migration. To revert: `git revert` the implementation commit and redeploy. Existing blank-path callers are unaffected because the new arg and field optionality are purely additive.
