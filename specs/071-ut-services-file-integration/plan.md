# Plan: Unit Tests for src/services/file-integration

## Phase 1: Analysis (complete)

- Identified 2 testable files: service (covered), controller (missing)
- Controller has 2 methods: `fileInfo` and `health`

## Phase 2: Implementation

### Task 1: Create `file.integration.controller.spec.ts`

- Mock `ack` utility via `vi.mock('../util', ...)`
- Bootstrap NestJS test module with `FileIntegrationController` + mocked `FileIntegrationService`
- Test `fileInfo()`: verifies ack called, delegates to service, returns service result
- Test `health()`: verifies ack called, returns `HealthCheckOutputData` with `healthy: true`

### Task 2: Verify coverage

- Run `pnpm vitest run --coverage src/services/file-integration`
- Target: >=80% statement coverage across the area

## Effort Estimate

- ~60 LOC for controller test
- Agentic path (scoped, <400 LOC)
