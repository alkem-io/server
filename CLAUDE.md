# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alkemio Server is a NestJS GraphQL server for the Alkemio collaboration platform. It exposes a GraphQL API at `/graphql` and orchestrates domain services, authentication (via Ory Kratos/Oathkeeper), and integrations (RabbitMQ, Matrix Synapse).

- **Scale**: ~3k TypeScript files
- **Key Roots**: `src/`, `test/`, `docs/`, `.specify/`, `scripts/`, `specs/<NNN-slug>/`

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Runtime         | Node.js 22 LTS (Volta pins 22.21.1)    |
| Package Manager | pnpm 10.17.1 via Corepack              |
| Framework       | NestJS 10, TypeORM 0.3*, Apollo Server 4 |
| Language        | TypeScript 5.3                          |
| Database        | PostgreSQL 17.5                         |
| Messaging       | RabbitMQ queues                         |
| Auth            | Ory Kratos/Oathkeeper                   |
| Monitoring      | Elastic APM                             |
| Logging         | Winston                                 |

*TypeORM uses a custom fork (`pkg.pr.new/antst/typeorm`) — not the standard npm package. Be aware when debugging TypeORM behavior.

## Common Commands

```bash
# Install / Build
pnpm install
pnpm build

# Start server (requires dependencies running)
pnpm start              # Production mode
pnpm start:dev          # Hot reload
pnpm start:services     # Start dependencies via Docker Compose

# Lint (uses Biome)
pnpm lint               # tsc --noEmit + biome check
pnpm lint:fix           # Auto-fix with biome check --write
pnpm format             # Format with biome format --write

# Tests (Vitest 4.x)
pnpm test:ci            # CI tests with coverage (~2-3 min)
pnpm test:ci:no:coverage # CI tests without coverage (faster)
pnpm test -- path/to/spec.ts  # Run specific test file

# Database migrations (requires DSN env vars from .env)
pnpm run migration:generate -n MigrationName
pnpm run migration:run
pnpm run migration:revert
pnpm run migration:validate  # Runs .scripts/migrations/run_validate_migration.sh

# GraphQL schema contract
pnpm run schema:print   # Generate schema.graphql
pnpm run schema:sort    # Canonical sort
pnpm run schema:diff    # Diff vs tmp/prev.schema.graphql (review change-report.json)
pnpm run schema:validate # Validate schema
```

## Architecture

### Source Structure (`src/`)

- **`domain/`**: Business logic aggregates — spaces, collaboration, community, communication, templates, storage
- **`services/api/`**: GraphQL resolvers bridging domain layer
- **`services/adapters/`**: External integration adapters (SSI, file storage)
- **`services/infrastructure/`**: RabbitMQ workers, infrastructure services
- **`common/`**: Cross-cutting utilities, decorators, exceptions, enums
- **`core/`**: Framework setup — authorization, validation, pagination, bootstrap
- **`library/`**: Isolated reusable utilities (no NestJS DI reliance)
- **`platform/`**: Platform-scoped modules
- **`platform-admin/`**: Admin operations
- **`config/`**: Configuration and TypeORM setup
- **`migrations/`**: Database migrations
- **`tools/`**: CLI tools (schema print/sort/diff/validate)
- **`schema-contract/`**: Schema contract enforcement logic
- **`schema-bootstrap/`**: Schema bootstrap module
- **`apm/`**: Elastic APM integration
- **`types/`**: Shared type definitions

### Layered Architecture

Data Layer (entities) → Repositories → Domain Services (business logic) → API Layer (GraphQL resolvers)

State changes flow: validation → authorization → domain operation → event emission → persistence. Direct repository calls from resolvers are forbidden.

## Development Workflow

### Specification-Driven Development (SDD)

SDD is **mandatory** for feature work. Read `.specify/memory/constitution.md` first.

**Canonical progression:** `/spec` → `/clarify` → `/plan` → `/checklist` → `/tasks` → `/implement`

**Work classification:**

- **Agentic path**: Scoped changes (≤ ~400 LOC with known outcomes)
- **Full SDD**: Contracts, migrations, or high ambiguity

### Local Development Flow

1. Start dependencies: `pnpm run start:services` (PostgreSQL 17.5, RabbitMQ, Redis, Ory Kratos/Oathkeeper)
2. Run migrations: `pnpm run migration:run`
3. Start server: `pnpm start:dev`
4. Access GraphQL Playground at `/graphiql`
5. Stop services: `docker compose -f quickstart-services.yml down`

Specialized stacks:

```bash
pnpm run start:services:ai        # AI debugging
pnpm run start:services:ai:debug  # AI debugging (verbose)
sudo bash ./.scripts/bootstrap_synapse.sh  # Matrix/Synapse
```

Environment variables: `.env` for TypeORM CLI, `.env.docker` for Docker Compose.

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

- Declare `nullable: false` explicitly on all NOT NULL columns (TypeORM default varies by context)
- Declare `default` in `@Column()` when the DB column has a DEFAULT (e.g., `default: 0`, `default: {}`)
- Non-eager relations must be optional
- Always use length constants: `UUID_LENGTH`, `ENUM_LENGTH`, `URI_LENGTH`
- Generate migrations after schema changes
- **Actor CTI pattern**: The `actor` entity uses Class Table Inheritance (`pattern: 'CTI'`) with a PostgreSQL enum discriminator: `@TableInheritance({ pattern: 'CTI', column: { type: 'enum', enum: ActorType, name: 'type' } })`. Each actor type (User, Organization, VirtualContributor, Account) has its own table extending the base `actor` table.

### GraphQL API Conventions

- Mutations take a single Input object (unique per mutation)
- All mutations require descriptions
- Use Assign/Remove naming for relation mutations
- Naming: mutations = imperative (`createSpace`), queries = descriptive (`spaceById`)
- Inputs end with `Input`, payloads end with `Result` or entity name
- New queries about the current user go under the `me` root query
- New queries for admin operations go under the `platformAdmin` root query
- New queries about the platform operations go under the `platform` root query

### General Rules

- Follow path aliases defined in `tsconfig.json` (includes `@domain/*`, `@services/*`, `@common/*`, `@core/*`, `@platform/*`, `@library/*`, `@templates/*`, etc.)
- All schema changes require regenerating `schema.graphql`
- Emit domain events instead of direct repository writes
- Align new GraphQL surface area with `docs/Pagination.md`
- Enforce DTO validation

## Linting and Formatting

**Biome** for linting and formatting (config: `biome.json`). Inline ignore: `// biome-ignore lint/rule-name: reason`

Key rules: `noConsole`: error (use Winston), `noDebugger`: error, `noExplicitAny`: off (legacy). Underscore prefix (`_param`) ignores unused parameters.

## GraphQL Schema Contract

Schema changes are governed by a contract system:

1. Regenerate: `pnpm run schema:print && pnpm run schema:sort`
2. Diff: `pnpm run schema:diff` (needs `tmp/prev.schema.graphql`)
3. Review `change-report.json` — BREAKING changes require CODEOWNER approval with `BREAKING-APPROVED`
4. Deprecations must use format: `REMOVE_AFTER=YYYY-MM-DD | reason`

The `schema-baseline.yml` workflow manages `schema-baseline.graphql` on merges to `develop`. Do not manually update baseline unless automation is down (coordinate with CODEOWNERS).

## Testing

- **Unit tests**: `*.spec.ts` (in `src/` alongside code)
- **Integration tests**: `*.it-spec.ts` (in `test/functional/integration/`)
- **E2E tests**: `*.e2e-spec.ts` (in `test/functional/e2e/`)

Risk-based approach: add tests when they deliver real signal, skip trivial pass-through coverage. 100% coverage is NOT required.

Migration validation harness: `.scripts/migrations/run_validate_migration.sh` (snapshots DB → applies migration → exports CSVs → compares to reference → restores backup). Keep migrations idempotent, include rollback notes inline.

## CI/CD

| Workflow                       | Trigger              | Purpose                                      |
| ------------------------------ | -------------------- | -------------------------------------------- |
| `ci-tests.yml`                 | Push/PR to develop   | Runs CI test suite                           |
| `schema-contract.yml`          | PRs                  | Validates schema changes, posts diff comment |
| `schema-baseline.yml`          | Merge to `develop`   | Regenerates baseline, opens PR if changed    |
| `review-router.yml`            | PRs                  | PR review metrics                            |
| `build-release-docker-hub.yml` | Release              | Builds and publishes Docker images           |
| `build-deploy-k8s-*.yml`       | Deployment           | Targets dev/sandbox/test clusters (Hetzner)  |

## Git Conventions

- **All commits must be signed**
- Main branch for PRs: `develop`
- Update spec artifacts before product changes

## Documentation

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
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16 (034-unit-tests)
- N/A (no data model changes — test-only feature) (034-unit-tests)
- PostgreSQL 17.5
- PostgreSQL 17.5 (conversation, conversation_membership, room tables) (040-group-conversations)
- PostgreSQL 17.5 (space table + JSONB settings column) (041-subspace-sorting-pinning)
- TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1) + NestJS 10, TypeORM 0.3, Apollo Server 4, `@alkemio/matrix-adapter-lib`, `@golevelup/nestjs-rabbitmq` (082-matrix-space-lifecycle)
- PostgreSQL 17.5 (no schema changes needed — Go adapter manages Matrix ID mapping) (082-matrix-space-lifecycle)
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + `@ory/kratos-client ^26.2.0` (upgrade from ^1.2.0), NestJS 10, TypeORM 0.3, Apollo Server 4 (082-ory-stack-upgrade)
- PostgreSQL 17.5 (Kratos manages its own schema via `migrate sql`) (082-ory-stack-upgrade)
- TypeScript 5.3, Node.js 22 LTS (Volta pinned 22.21.1) + NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16 (083-collab-entitlement)
- PostgreSQL 17.5 — existing `license_plan` table (row insert) and existing `license_policy` table (jsonb column update); no schema DDL (083-collab-entitlement)
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + NestJS 10, TypeORM 0.3, `@nestjs/axios` (axios ^1.12.2), `rxjs` (085-file-service-migration)
- PostgreSQL 17.5 (file table — renamed from document — read-only for server) (085-file-service-migration)
- TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) + NestJS 10, TypeORM 0.3, `@nestjs/axios` (axios), GraphQL 16 (086-collabora-integration)
- PostgreSQL 17.5 (new `collabora_document` table + FK on `callout_contribution`) (086-collabora-integration)
- TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1) + NestJS 10, Apollo Server 4, GraphQL 16, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), `graphql-upload` v15 (existing — used by every current `Upload` mutation), `class-validator`, `class-transformer` (095-collabora-import)
- PostgreSQL 17.5; framing Collabora document persisted via existing `collabora_document` table; bytes via existing storage subsystem and file-service-go (Go service exposing the upload/sniff/validate API used today by `importCollaboraDocument`) (095-collabora-import)

## Recent Changes
- 028-migrate-biome-linting: Migrated from ESLint + Prettier to Biome for linting and formatting
- 027-vitest-migration: Migrated from Jest to Vitest for testing
