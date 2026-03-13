# Data Model: Unit Tests for `src/services/whiteboard-integration`

## No Data Model Changes

This is a test-only feature. No entities, migrations, or schema changes are involved.

## Key Types Used in Tests

### Input Types
- `AccessGrantedInputData` -- `{ userId, whiteboardId, privilege, guestName? }`
- `InfoInputData` -- class extending `BaseInputData` with `userId`, `whiteboardId`, `guestName`
- `WhoInputData` -- `{ auth: { cookie?, authorization?, guestName? } }`
- `SaveInputData` -- class extending `BaseInputData` with `whiteboardId`, `content`
- `FetchInputData` -- class extending `BaseInputData` with `whiteboardId`
- `ContributionInputData` -- class extending `BaseInputData` with `whiteboardId`, `users[]`
- `ContentModifiedInputData` -- class extending `BaseInputData` with `triggeredBy`, `whiteboardId`

### Output Types
- `InfoOutputData` -- `{ read, update, maxCollaborators }`
- `SaveOutputData` -- wraps `SaveContentData | SaveErrorData`
- `FetchOutputData` -- wraps `FetchContentData | FetchErrorData`
- `HealthCheckOutputData` -- `{ healthy: boolean }`

### Domain Types
- `ActorContext` -- `{ actorID, guestName, isAnonymous }`
