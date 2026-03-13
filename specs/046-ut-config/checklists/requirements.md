# Requirements Checklist: src/config Unit Tests

**Created**: 2026-03-12

## Functional Requirements

- [x] FR-001: ConfigUtils.parseHMSString parses duration strings correctly
- [x] FR-002: ConfigUtils.parseHMSString returns undefined for non-matching input
- [x] FR-003: configuration.ts loads YAML and substitutes env vars
- [x] FR-004: configuration.ts resolves config file from candidate paths
- [x] FR-005: configuration.ts coerces boolean and numeric strings
- [x] FR-006: fixUUIDColumnType converts char(36) to uuid
- [x] FR-007: fixUUIDColumnType delegates non-UUID types to original normalizeType
- [x] FR-008: WinstonConfigService creates transports from config
- [x] FR-009: WinstonConfigService supports file transport when enabled

## Non-Functional Requirements

- [x] NFR-001: Tests use Vitest 4.x with globals
- [x] NFR-002: External dependencies are mocked
- [x] NFR-003: Tests are co-located as *.spec.ts

## Success Criteria

- [x] SC-001: >=80% line coverage for src/config
- [x] SC-002: All tests pass
- [x] SC-003: No lint or typecheck errors
