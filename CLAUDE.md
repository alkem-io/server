# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alkemio Server is a NestJS GraphQL server for the Alkemio collaboration platform. It exposes a GraphQL API at `/graphql` and orchestrates domain services, authentication (via Ory Kratos/Oathkeeper), and integrations (RabbitMQ, Matrix Synapse, Elasticsearch).

**Stack**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1), pnpm 10.17.1, NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, PostgreSQL 17.5.

## Common Commands

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start server (requires dependencies running)
pnpm start              # Production mode
pnpm start:dev          # Hot reload
pnpm start:services     # Start dependencies via Docker Compose

# Lint (uses Biome)
pnpm lint               # tsc --noEmit + biome check
pnpm lint:fix           # Auto-fix with biome check --write
pnpm format             # Format with biome format --write

# Tests
pnpm test:ci            # CI tests with coverage (~2-3 min)
pnpm test:ci:no:coverage # CI tests without coverage (faster)
pnpm test -- path/to/spec.ts  # Run specific test file

# Database migrations
pnpm run migration:generate -n MigrationName
pnpm run migration:run
pnpm run migration:revert

# GraphQL schema contract
pnpm run schema:print   # Generate schema.graphql
pnpm run schema:sort    # Canonical sort
pnpm run schema:diff    # Diff vs tmp/prev.schema.graphql (review change-report.json)
```

## Architecture

### Source Structure (`src/`)

- **`domain/`**: Business logic aggregates - spaces, collaboration, community, communication, templates, storage
- **`services/api/`**: GraphQL resolvers bridging domain layer
- **`services/adapters/`**: External integration adapters (SSI, file storage)
- **`services/infrastructure/`**: RabbitMQ workers, infrastructure services
- **`common/`**: Cross-cutting utilities, decorators, exceptions, enums
- **`core/`**: Framework setup - authorization, validation, pagination, bootstrap
- **`library/`**: Isolated reusable utilities (no NestJS DI reliance)
- **`platform/`**: Platform-scoped modules
- **`platform-admin/`**: Admin operations
- **`config/`**: Configuration and TypeORM setup
- **`migrations/`**: Database migrations

### Layered Architecture

Data Layer (entities) → Repositories → Domain Services (business logic) → API Layer (GraphQL resolvers)

State changes flow: validation → authorization → domain operation → event emission → persistence. Direct repository calls from resolvers are forbidden.

## Development Workflow

### Specification-Driven Development (SDD)

SDD is **mandatory** for feature work. Read `.specify/memory/constitution.md` first.

**Canonical progression:** `/spec` → `/clarify` → `/plan` → `/checklist` → `/tasks` → `/implement`

**Artifacts location:** `specs/<NNN-slug>/`

**Work classification:**

- **Agentic path**: Scoped changes (≤ ~400 LOC with known outcomes)
- **Full SDD**: Contracts, migrations, or high ambiguity

## Coding Standards

### Exception Handling

Never include dynamic data (IDs, emails) in exception messages. Use structured `details` property:

```typescript
throw new EntityNotFoundException(
  'User not found',
  LogContext.AUTH,
  { userId: id } // ExceptionDetails - third parameter
);
```

### Logging

Winston logger signatures:

- **verbose/warning**: `(message: string | object, context: string)`
- **error**: `(message: string | object, stacktrace: string, context: string)`

### TypeORM Entity Guidelines

- No defaults in entity definitions or class fields
- Non-eager relations must be optional
- Always use length constants: `UUID_LENGTH`, `ENUM_LENGTH`, `URI_LENGTH`
- Generate migrations after schema changes

### GraphQL API Conventions

- Mutations take a single Input object (unique per mutation)
- All mutations require descriptions
- Use Assign/Remove naming for relation mutations
- Naming: mutations = imperative (`createSpace`), queries = descriptive (`spaceById`)
- Inputs end with `Input`, payloads end with `Result` or entity name

## GraphQL Schema Contract

Schema changes are governed by a contract system:

1. Regenerate: `pnpm run schema:print && pnpm run schema:sort`
2. Diff: `pnpm run schema:diff` (needs `tmp/prev.schema.graphql`)
3. Review `change-report.json` - BREAKING changes require CODEOWNER approval with `BREAKING-APPROVED`
4. Deprecations must use format: `REMOVE_AFTER=YYYY-MM-DD | reason`

The `schema-baseline.yml` workflow manages `schema-baseline.graphql` on merges to `develop`.

## Testing

Test types and naming:

- **Unit tests**: `*.spec.ts` (in `src/` alongside code)
- **Integration tests**: `*.it-spec.ts` (in `test/functional/integration/`)
- **E2E tests**: `*.e2e-spec.ts` (in `test/functional/e2e/`)

Use a risk-based approach: add tests when they deliver real signal, skip trivial pass-through coverage. 100% coverage is NOT required.

## Environment Setup

Required services (via `pnpm run start:services`):

- PostgreSQL 17.5 (port 5432)
- RabbitMQ (port 5672)
- Redis
- Ory Kratos/Oathkeeper (identity)
- Elasticsearch

Environment variables in `.env` for TypeORM CLI. Docker Compose uses `.env.docker`.

## Path Aliases

TypeScript path aliases configured in `tsconfig.json`:

- `@domain/*` → `src/domain/*`
- `@services/*` → `src/services/*`
- `@common/*` → `src/common/*`
- `@core/*` → `src/core/*`
- `@platform/*` → `src/platform/*`
- `@library/*` → `src/library/*`
- `@config/*` → `src/config/*`
- `@interfaces/*` → `src/common/interfaces/*`
- `@constants/*` → `src/common/constants/*`
- `@src/*` → `src/*`
- `@test/*` → `test/*`

## Linting and Formatting

The project uses **Biome** for linting and formatting (replaced ESLint + Prettier).

- Configuration: `biome.json` at repository root
- Inline ignore: `// biome-ignore lint/rule-name: reason`
- VS Code extension: `biomejs.biome`

Key rules:
- `noConsole`: error (use Winston logger instead)
- `noDebugger`: error
- `noExplicitAny`: off (legacy codebase compatibility)
- Underscore prefix (`_param`) ignores unused parameters

## Active Technologies
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + NestJS 10, Vitest 4.x, Biome for linting/formatting
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16 (034-unit-tests)
- N/A (no data model changes — test-only feature) (034-unit-tests)
- PostgreSQL 17.5
- TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1) + NestJS 10, TypeORM 0.3, Apollo Server 4, RabbitMQ (amqplib), elastic-apm-node (036-optimize-authorization)
- PostgreSQL 17.5 — `authorization_policy` table with JSONB columns (`credentialRules`, `privilegeRules`) (036-optimize-authorization)
- TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1) + NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, RabbitMQ (amqplib), elastic-apm-node (036-optimize-authorization)
- PostgreSQL 17.5 — `authorization_policy` table with JSONB columns (`credentialRules`, `privilegeRules`); new `inherited_credential_rule_set` table (036-optimize-authorization)

## Recent Changes
- 028-migrate-biome-linting: Migrated from ESLint + Prettier to Biome for linting and formatting
- 027-vitest-migration: Migrated from Jest to Vitest for testing
