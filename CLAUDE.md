# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alkemio Server is a NestJS GraphQL server for the Alkemio collaboration platform. It exposes a GraphQL API at `/graphql` and orchestrates domain services, authentication (via Ory Kratos/Oathkeeper), and integrations (RabbitMQ, Matrix Synapse, Elasticsearch).

**Stack**: TypeScript 5.3, Node.js 20 LTS (Volta pins 20.15.1), pnpm 10.17.1, NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, PostgreSQL 17.5 (MySQL 8 deprecated).

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

# Lint
pnpm lint               # tsc --noEmit + ESLint
pnpm lint:fix           # Auto-fix ESLint issues

# Tests
pnpm test               # Run tests (Jest)
pnpm test:ci            # CI tests with coverage
pnpm test:ci:no:coverage # CI tests without coverage (faster)

# Run specific test file
pnpm test -- path/to/spec.ts

# Database migrations
pnpm run migration:generate -n MigrationName  # Generate migration
pnpm run migration:run                         # Apply migrations
pnpm run migration:revert                      # Revert last migration
pnpm run migration:show                        # Show migration status

# GraphQL schema contract
pnpm run schema:print   # Generate schema.graphql
pnpm run schema:sort    # Canonical sort
pnpm run schema:diff    # Diff vs tmp/prev.schema.graphql
```

## Architecture

### Source Structure (`src/`)

- **`domain/`**: Business logic aggregates - spaces, collaboration, community, communication, templates, storage
- **`services/api/`**: GraphQL resolvers bridging domain layer
- **`services/adapters/`**: External integration adapters (SSI, file storage)
- **`services/infrastructure/`**: RabbitMQ workers, infrastructure services
- **`common/`**: Shared utilities, decorators, exceptions, enums
- **`core/`**: Framework setup - authorization, validation, pagination, bootstrap
- **`platform/`**: Platform-scoped modules
- **`platform-admin/`**: Admin operations
- **`config/`**: Configuration and TypeORM setup
- **`migrations/`**: Database migrations

### Key Domain Areas

- **space/**: Core Space entity and hierarchy
- **collaboration/**: Callouts, posts, whiteboards, innovation flows
- **community/**: Users, organizations, virtual contributors, roles
- **communication/**: Rooms, messages, discussions
- **agent/**: Credentials and authorization agents

### Layered Architecture

Data Layer (entities) → Data Access Layer (repositories) → Service Layer (business logic) → API Layer (GraphQL resolvers)

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
- Generate migrations after schema changes: `pnpm run migration:generate`

### GraphQL API Conventions

- Mutations take a single Input object (unique per mutation)
- All mutations require descriptions
- Use Assign/Remove naming for relation mutations
- Update cascading only for one-to-one relationships

## GraphQL Schema Contract

Schema changes are governed by a contract system. Any schema-affecting change requires:

1. Regenerate: `pnpm run schema:print && pnpm run schema:sort`
2. Diff: `pnpm run schema:diff` (needs `tmp/prev.schema.graphql`)
3. Review `change-report.json` classifications
4. BREAKING changes require CODEOWNER approval with `BREAKING-APPROVED` phrase
5. Deprecations must use format: `REMOVE_AFTER=YYYY-MM-DD | reason`

## Testing

Test types and naming:

- **Unit tests**: `*.spec.ts` (in `src/` alongside code)
- **Integration tests**: `*.it-spec.ts` (in `test/functional/integration/`)
- **E2E tests**: `*.e2e-spec.ts` (in `test/functional/e2e/`)

Run single test: use `.only` on `test` or `describe`, then run the specific file.

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
- `@src/*` → `src/*`
