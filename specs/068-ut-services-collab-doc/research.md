# Research: collaborative-document-integration

## Module Structure

The `collaborative-document-integration` module bridges the Alkemio GraphQL server with a collaborative document editor (e.g. Hocuspocus/Yjs) via RabbitMQ message patterns.

### Components
| File | Role | Testable Logic |
|------|------|----------------|
| `controller.ts` | RabbitMQ message handler | Delegation, ack, return values |
| `service.ts` | Business logic | Authorization, CRUD, contributions (already tested) |
| `outputs/*.ts` | Response DTOs + type guards | `isFetchErrorData`, `isSaveErrorData` |
| `inputs/*.ts` | Request DTOs | No logic |
| `types/*.ts` | Enums, types | No logic |

### Message Patterns
- `INFO` -- returns read/update/multiUser permissions
- `WHO` -- resolves authenticated user ID from auth headers
- `HEALTH_CHECK` -- returns `{ healthy: true }`
- `SAVE` -- persists binary document state
- `FETCH` -- retrieves document content as base64
- `MEMO_CONTRIBUTION` (event pattern) -- reports user contributions to Elasticsearch

### Dependencies
- `ack()` from `@services/util` -- acknowledges RabbitMQ messages
- Winston logger -- verbose logging per handler
- `CollaborativeDocumentIntegrationService` -- all business logic

## Existing Coverage
The service spec (`collaborative-document-integration.service.spec.ts`) covers all 5 public methods with 14 test cases including error paths.
