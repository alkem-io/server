# Data Model: Unit Tests for `src/services/room-integration`

## Entities Referenced

No data model changes. The service references the following entities through its dependency on `RoomLookupService`:

| Entity | Role |
|---|---|
| `Room` | Communication room entity; primary lookup target |
| `Callout` | Collaboration entity optionally linked to a room |
| `Post` | Collaboration entity optionally linked to a room |

## DTOs

| DTO | Usage |
|---|---|
| `RoomDetails` | Contains `roomID`, `threadID`, `actorID` for message routing |
| `InvokeEngineResult` | Event payload containing original request and AI response |
| `InvokeEngineResponse` | Response body with `result`, `sources`, and optional `threadId` |

All entities and DTOs are mocked in tests; no database interaction occurs.
