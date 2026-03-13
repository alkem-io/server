# Specification: Unit Tests for src/services/file-integration

## Objective

Achieve >=80% test coverage for `src/services/file-integration/` by adding missing unit tests for the controller layer while maintaining the existing service tests.

## Scope

### In-Scope Files (testable logic)

| File | Status | Notes |
|------|--------|-------|
| `file.integration.service.ts` | Covered | Existing spec covers all 6 branches |
| `file.integration.controller.ts` | Missing | 2 RMQ message handlers need tests |

### Out-of-Scope Files (excluded by convention)

- `file.integration.module.ts` - NestJS module wiring
- `index.ts`, `inputs/index.ts`, `outputs/index.ts` - barrel exports
- `inputs/base.input.data.ts`, `inputs/file.info.input.data.ts` - DTOs
- `outputs/base.output.data.ts`, `outputs/file.info.output.data.ts`, `outputs/health.check.output.data.ts` - DTOs
- `types/message.pattern.ts` - enum constants

## Key Dependencies

- `FileIntegrationService` - injected into controller
- `ack()` from `../util` - acknowledges RMQ messages
- `RmqContext` from `@nestjs/microservices` - RabbitMQ context

## Test Strategy

- Controller methods are thin wrappers: ack the message, delegate to service
- Mock `ack` at module level via `vi.mock`
- Mock `FileIntegrationService.fileInfo` via `defaultMockerFactory`
- Verify ack is called and delegation happens correctly
