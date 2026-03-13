# Data Model: collaborative-document-integration

## No Data Model Changes

This is a test-only specification. No entities, migrations, or schema changes are involved.

## Relevant Data Structures (read-only reference)

### Input DTOs
- `BaseInputData { event: string }`
- `InfoInputData extends BaseInputData { userId, documentId }`
- `WhoInputData extends BaseInputData { auth: { cookie?, authorization? } }`
- `SaveInputData extends BaseInputData { documentId, binaryStateInBase64 }`
- `FetchInputData extends BaseInputData { documentId }`
- `MemoContributionsInputData extends BaseInputData { memoId, users: { id }[] }`

### Output DTOs
- `BaseOutputData { event: string }`
- `InfoOutputData { read, update, isMultiUser, maxCollaborators }`
- `SaveOutputData extends BaseOutputData { data: SaveContentData | SaveErrorData }`
- `FetchOutputData extends BaseOutputData { data: FetchContentData | FetchErrorData }`
- `HealthCheckOutputData extends BaseOutputData { healthy: boolean }`

### Error Codes
- `FetchErrorCodes: NOT_FOUND | INTERNAL_ERROR`
- `SaveErrorCodes: NOT_FOUND | INTERNAL_ERROR | FORBIDDEN`
