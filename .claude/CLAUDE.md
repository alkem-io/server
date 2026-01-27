# Claude Code Configuration

> NestJS GraphQL server for the Alkemio collaboration platform

---

## Project Overview

- **Purpose**: GraphQL API server exposing `http://localhost:3000/graphql`, orchestrating domain and integration services
- **Scale**: ~3k TypeScript files
- **Key Roots**: `src/`, `test/`, `docs/`, `.specify/`, `scripts/`, `specs/00x-*`

---

## Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Runtime         | Node.js 22 LTS (Volta pins 22.21.1)     |
| Package Manager | pnpm 10.17.1 via Corepack               |
| Framework       | NestJS 10, TypeORM 0.3, Apollo Server 4 |
| Language        | TypeScript 5.3                          |
| Database        | PostgreSQL 17.5                         |
| Messaging       | RabbitMQ queues                         |
| Auth            | Ory Kratos/Oathkeeper                   |
| Monitoring      | Elastic APM                             |
| Logging         | Winston                                 |

---

## Development Workflow

### Specification-Driven Development (SDD)

SDD is **mandatory** for feature work. Read `.specify/memory/constitution.md` first.

**Canonical progression:**

```
/spec → /clarify → /plan → /checklist → /tasks → /implement → /stabilize → /done
```

**Artifacts location:** `specs/<NNN-slug>/` (plan, spec, checklist, tasks)

**Work classification** (per `agents.md`):

- **Agentic path**: Scoped changes (≤ ~400 LOC with known outcomes)
- **Full SDD**: Contracts, migrations, or high ambiguity

---

## Environment Setup

### Prerequisites

| Tool                  | Version  | Notes                                                         |
| --------------------- | -------- | ------------------------------------------------------------- |
| Node.js               | ≥22.0    | Volta config helps                                            |
| pnpm                  | ≥10.17.1 | `corepack enable && corepack prepare pnpm@10.17.1 --activate` |
| Docker + Compose      | Latest   | Required for services                                         |
| PostgreSQL            | 17.5     |                                                               |
| RabbitMQ              | Latest   | Message queue                                                 |
| Redis                 | Latest   | Caching                                                       |
| Ory Kratos/Oathkeeper | -        | Auth stack                                                    |

### Optional Tools

- `jq` - Used in docs for auth flows
- `psql` client - Direct DB access
- `mkcert` - TLS dev certificates

### Configuration Files

- `.env.docker` - Feeds compose stacks
- `.env` - Local variables for TypeORM CLI
- `tsconfig.json` - Path aliases (`@domain/*`, `@services/*`)
- `eslint.config.js` - Flat config with Prettier integration

---

## Coding Standards

### Exception Handling

**Never** include dynamic data (IDs, emails) in exception messages. Use structured properties instead:

```typescript
// Correct
throw new NotFoundException('Entity not found', undefined, {
  entityId: id,
  entityType: 'User',
} as ExceptionDetails);

// Incorrect
throw new NotFoundException(`User ${id} not found`);
```

### Logging

| Level   | Signature                        |
| ------- | -------------------------------- |
| Verbose | `(message, context)`             |
| Warning | `(message, context)`             |
| Error   | `(message, stacktrace, context)` |

Message parameter accepts string or object for structured data.

### General Rules

- Follow path aliases defined in `tsconfig.json`
- ESLint enforces `@typescript-eslint/no-unused-vars` strictly
- All schema changes require regenerating `schema.graphql`
- Emit domain events instead of direct repository writes
- Align new GraphQL surface area with `docs/Pagination.md`
- Enforce DTO validation

---

## Build & Run Commands

### Essential Commands

```bash
# Install dependencies (run after pulling)
pnpm install

# Build (outputs to dist/)
pnpm build

# Start development server with hot reload
pnpm start:dev

# Start production server
pnpm start
```

### Local Development Flow

1. Start dependencies:

   ```bash
   pnpm run start:services  # Uses quickstart-services.yml
   ```

2. Run migrations:

   ```bash
   pnpm run migration:run
   ```

3. Start server:

   ```bash
   pnpm start:dev
   ```

4. Access GraphQL Playground at `/graphiql`

5. Stop services:
   ```bash
   docker compose -f quickstart-services.yml down
   ```

### Specialized Stacks

```bash
# AI debugging
pnpm run start:services:ai
pnpm run start:services:ai:debug

# Matrix/Synapse bootstrap
sudo bash ./.scripts/bootstrap_synapse.sh
```

---

## Testing & Quality Gates

### Linting

```bash
pnpm lint  # Runs tsc --noEmit + ESLint
```

### Testing

```bash
# Full test suite with coverage (~2-3 min)
pnpm test:ci

# Quick verification (no coverage)
pnpm run test:ci:no:coverage

# Targeted test
pnpm run test:ci path/to/spec
```

Coverage output: `coverage-ci/lcov.info`

### Other Quality Tools

```bash
# Check circular dependencies (requires built dist/)
pnpm run circular-dependencies

# Format code
pnpm format
```

---

## Schema Management

### Workflow

1. Print schema:

   ```bash
   pnpm run schema:print
   ```

2. Sort schema:

   ```bash
   pnpm run schema:sort
   ```

3. Diff against baseline:

   ```bash
   pnpm run schema:diff
   ```

   Requires `tmp/prev.schema.graphql` (fetch from base branch if absent)

4. Review `change-report.json`:
   - `BREAKING` entries need CODEOWNER review with `BREAKING-APPROVED` comment

5. Validate (optional):
   ```bash
   pnpm run schema:validate
   ```

### Baseline Management

- `schema-baseline.yml` workflow manages `schema-baseline.graphql` on merges to `develop`
- Do not manually update baseline unless automation is down (coordinate with CODEOWNERS)
- Preview summary locally:
  ```bash
  pnpm exec ts-node scripts/schema/publish-baseline.ts --report change-report.json
  ```

---

## Database Migrations

### Commands

```bash
# Generate migration (requires DSN env vars)
pnpm run migration:generate -n <Name>

# Run migrations
pnpm run migration:run

# Revert last migration
pnpm run migration:revert

# Validate migration
pnpm run migration:validate
```

### Validation Harness

```bash
.scripts/migrations/run_validate_migration.sh
```

This script: snapshots DB → applies migration → exports CSVs → compares to reference → restores backup

### Best Practices

- Keep migrations idempotent
- Include rollback notes inline

---

## Project Layout

```
src/
├── main.ts              # Entry point (bootstraps NestJS)
├── domain/              # Aggregates, repositories, domain services
├── services/
│   ├── api-*/           # GraphQL + REST resolvers/controllers
│   ├── adapters/        # External integrations (SSI, file storage)
│   └── infrastructure/  # Rabbit workers, etc.
├── common/              # Cross-cutting utilities
├── core/                # Bootstrap logic
├── config/              # Configuration modules
├── library/             # Shared utilities
├── platform/            # Platform-scoped modules
└── platform-admin/      # Admin operations

test/
├── functional/
│   ├── e2e/
│   └── integration/
├── unit/
└── config/jest.*

specs/00x-*/             # Specification artifacts
docs/                    # Documentation
├── Developing.md
├── Running.md
├── QA.md
├── DataManagement.md
├── Design.md
├── authorization-forest.md
└── credential-based-authorization.md
```

---

## CI/CD

### GitHub Actions Workflows

| Workflow                       | Trigger            | Purpose                                      |
| ------------------------------ | ------------------ | -------------------------------------------- |
| `schema-contract.yml`          | PRs                | Validates schema changes, posts diff comment |
| `schema-baseline.yml`          | Merge to `develop` | Regenerates baseline, opens PR if changed    |
| `build-release-docker-hub.yml` | Release            | Builds and publishes Docker images           |
| `build-deploy-k8s-*.yml`       | Deployment         | Targets dev/sandbox/test clusters            |
| `trigger-e2e-tests.yml`        | Dispatch           | Triggers full-stack tests                    |

### Schema Contract CI

- Fails on unapproved `BREAKING` or `PREMATURE_REMOVAL` issues
- Posts sticky PR comment with diff summary

---

## Git Conventions

- **All commits must be signed**
- Main branch for PRs: `develop`
- Update spec artifacts before product changes

---

## Port Configuration

Default ports (adjust via environment if conflicts):

- `3000` - GraphQL API
- `4000`, `4001` - Additional services
- `5432` - PostgreSQL
- `5672` - RabbitMQ

---

## Documentation References

| Topic           | File                                     |
| --------------- | ---------------------------------------- |
| Setup           | `docs/Developing.md`                     |
| Running         | `docs/Running.md`                        |
| QA              | `docs/QA.md`                             |
| Data Management | `docs/DataManagement.md`                 |
| Architecture    | `docs/Design.md`                         |
| Authorization   | `docs/authorization-forest.md`           |
| Credentials     | `docs/credential-based-authorization.md` |
| Pagination      | `docs/Pagination.md`                     |
| Constitution    | `.specify/memory/constitution.md`        |
