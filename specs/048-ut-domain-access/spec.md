# Unit Tests for src/domain/access

## Objective
Achieve >=80% statement coverage for `src/domain/access/` by adding unit tests to services, resolvers, guards, lifecycle services, authorization services, and data loaders that currently lack adequate coverage.

## Scope
- **In scope**: All `.service.ts`, `.resolver.*.ts`, `.service.authorization.ts`, `.service.lifecycle.ts`, `.service.events.ts`, `.service.license.ts`, `.service.cache.ts`, `.data.loader.*.ts`, `actor.role.policy.ts` files under `src/domain/access/`
- **Out of scope**: `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`, `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts`

## Current State
- 10 existing test files covering 145 tests
- Current statement coverage: ~27%
- Target: >=80% statement coverage

## Key Areas Needing Tests
1. **role-set/role.set.service.ts** (8.19% -> largest gap, ~1890 lines)
2. **Authorization services** (0%): application, invitation, invitation.platform, role-set
3. **Lifecycle services** (0-33%): application, invitation, role-set application/invitation
4. **Events service** (0%): role-set events
5. **License service** (0%): role-set license
6. **Resolver files** (0-25%): all field resolvers and mutation resolvers
7. **Data loader** (0%): actor roles data loader

## Constraints
- Tests must use Vitest 4.x with globals
- NestJS Test module with `defaultMockerFactory`
- Co-located with source files as `*.spec.ts`
- Follow existing test patterns in the codebase
