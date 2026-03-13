# Feature Specification: Unit Test Coverage for src/config

**Feature Branch**: `ut-config`
**Created**: 2026-03-12
**Status**: Complete

## User Scenarios & Testing

### User Story 1 - Config Module Test Coverage (Priority: P1)

As a developer, I want unit tests for the `src/config` area so that configuration logic is verified and regressions are caught early.

**Acceptance Criteria:**
- All config services and utility classes have unit tests
- Coverage is at least 80% line coverage for `src/config`
- Tests are co-located with source files
- Tests follow project Vitest conventions

## Requirements

### Functional Requirements

- FR-001: `ConfigUtils.parseHMSString` MUST correctly parse duration strings (days, hours, minutes, seconds) and return total seconds
- FR-002: `ConfigUtils.parseHMSString` MUST return `undefined` for non-matching input
- FR-003: `configuration.ts` MUST load YAML config files and substitute environment variables
- FR-004: `configuration.ts` MUST resolve config file path from multiple candidate locations
- FR-005: `configuration.ts` MUST convert string `true`/`false` to booleans and numeric strings to numbers
- FR-006: `fixUUIDColumnType` MUST convert `char(36)` columns to `uuid` type for PostgreSQL
- FR-007: `fixUUIDColumnType` MUST pass through non-UUID column types to the original `normalizeType`
- FR-008: `WinstonConfigService` MUST create transports based on configuration values
- FR-009: `WinstonConfigService` MUST support file transport when `context_to_file` is enabled

### Non-Functional Requirements

- NFR-001: Tests MUST use Vitest 4.x with globals enabled
- NFR-002: Tests MUST mock external dependencies (file system, ConfigService)
- NFR-003: Tests MUST be co-located with source files as `*.spec.ts`

## Success Criteria

- SC-001: Coverage report shows >=80% line coverage for src/config
- SC-002: All tests pass with `pnpm vitest run src/config`
- SC-003: No lint or typecheck errors introduced
