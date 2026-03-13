# Unit Tests for src/domain/communication

## Objective
Achieve >=80% statement coverage for `src/domain/communication/` by adding unit tests for services, resolvers, authorization services, and event handlers that currently lack adequate test coverage.

## Scope
- **In scope**: All `.service.ts`, `.service.authorization.ts`, `.service.events.ts`, `.resolver.fields.ts`, `.resolver.mutations.ts`, `.resolver.subscription.ts`, `.data.loader.ts` files under `src/domain/communication/`
- **Out of scope**: Entity files, interfaces, modules, DTOs, enums, types, constants, index files

## Current State
- 47.12% statement coverage across 11 existing test files with 151 tests
- Key gaps: `communication/` (17.56%), `room/` (24.9%), `messaging/` (53.95%), `conversation/` (57.56%), `message/` (11.11%), `message.reaction/` (0%)

## Target State
- >=80% statement coverage
- All testable service methods and resolver methods covered
- Consistent test patterns using NestJS Test module, Vitest 4.x, and project mock utilities
