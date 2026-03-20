# Research: src/services/file-integration

## Area Overview

The file-integration service handles file access requests over RabbitMQ. It consists of:

1. **FileIntegrationController** - RMQ `@MessagePattern` handlers for `file-info` and `health-check`
2. **FileIntegrationService** - Business logic for file info retrieval with auth checks

## Architecture

```
RabbitMQ -> FileIntegrationController -> FileIntegrationService
                |                              |
                ack(context)            AuthenticationService
                                        AuthorizationService
                                        DocumentService
                                        StorageService
```

## Controller Pattern

The controller follows a consistent pattern across the codebase:
- Receive `@Payload()` data and `@Ctx()` RmqContext
- Call `ack(context)` to acknowledge the RMQ message
- Delegate to the service layer
- Return the service result directly

## Existing Test Coverage

`file.integration.service.spec.ts` covers:
- Empty docId -> FILE_NOT_FOUND
- Empty auth -> NO_AUTH_PROVIDED
- Document not found in DB -> DOCUMENT_NOT_FOUND
- File not in storage -> FILE_NOT_FOUND
- No read access -> NO_READ_ACCESS
- Success path -> returns file info

## Dependencies for Testing

- `@golevelup/ts-vitest` for `createMock`
- `@test/mocks/winston.provider.mock` for logger
- `@test/utils/default.mocker.factory` for auto-mocking
- `vi.mock` for module-level mocking of `ack`
