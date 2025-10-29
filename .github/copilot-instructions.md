<!-- Implements constitution & agents.md. Does not introduce new governance. -->

# Copilot Onboarding Guide

## Repository Snapshot

- Purpose: NestJS GraphQL server for the Alkemio collaboration platform; exposes `http://localhost:3000/graphql` and orchestrates domain + integration services.
- Stack: TypeScript, Node 20 LTS (Volta pins 20.15.1), pnpm 10.17.1 via Corepack, NestJS, TypeORM (MySQL), Apollo Server, RabbitMQ queues, Elastic APM, Ory Kratos/Oathkeeper for auth.
- Scale: ~3k TypeScript files; key roots include `src/`, `test/`, `docs/`, `.specify/`, `scripts/`, `specs/00x-*`, `quickstart-*.yml`, `Dockerfile`, `package.json`, `pnpm-lock.yaml`.
- Docs: `docs/Developing.md`, `docs/Running.md`, `docs/QA.md`, `docs/DataManagement.md`, `docs/Design.md` hold authoritative setup, architecture, QA, and migration guidance.

## Governance & Workflow

- Specification-Driven Development is mandatory for feature work. Read `.specify/memory/constitution.md` first; it defines quality gates, module boundaries, and testing expectations.
- Artifacts live under `specs/<NNN-slug>/` (plan, spec, checklist, tasks). Follow the canonical progression: `/spec` → `/clarify` → `/plan` → `/checklist` → `/tasks` → `/implement` → `/stabilize` → `/done`.
- Classify work per `agents.md`: Manual Fix (≤40 LOC, trivial), Agentic Flow (medium scoped refactors, supply mini-plan), Full SDD (net-new capabilities or schema/migration impact).
- All schema changes require regenerating `schema.graphql`, running `pnpm run schema:diff`, and addressing the schema contract gate.

## Environment & Toolchain

- Prerequisites: Node ≥20.9 (Volta config helps), pnpm ≥10.17.1 (`corepack enable && corepack prepare pnpm@10.17.1 --activate`), Docker + Compose, MySQL 8 (with `mysql_native_password`), RabbitMQ, Redis, Ory Kratos/Oathkeeper stack. `.env.docker` feeds compose stacks; local `.env` variables are required for TypeORM CLI.
- Optional but recommended: jq (used in docs for auth flows), mysql client, mkcert for TLS dev.
- Module resolution uses `tsconfig.json` path aliases (e.g. `@domain/*`, `@services/*`). ESLint is configured via `eslint.config.js` with flat config, Prettier integration, and production-stricter `@typescript-eslint/no-unused-vars`.

## Bootstrap, Build & Run

- Install dependencies (verified 2025-10-27):
  - `pnpm install` (0.6s when cache warm; respects `pnpm-lock.yaml`). Always run after pulling.
- Build artifacts:
  - `pnpm build` (passes; outputs to `dist/` and copies `alkemio.yml`).
- Local runtime without containers requires MySQL, RabbitMQ, Redis, Elastic, Kratos already up. Typical flow:
  1. `pnpm run start:services` to spin dependencies from `quickstart-services.yml` via Docker (maps server graphql endpoint to localhost:3000/graphql; clients still at 3000).
  2. `pnpm run migration:run` once services are healthy to prime schema.
  3. `pnpm start` (or `pnpm start:dev` for hot reload) launches the API on port configured in `config/hosting`. GraphQL Playground available at `/graphiql`.
  4. Stop compose via `docker compose -f quickstart-services.yml down` when finished.
- Specialized stacks:
  - `pnpm run start:services:ai(:debug)` AI debugging.
  - Synapse (Matrix) bootstrap script: `sudo bash ./.scripts/bootstrap_synapse.sh`.

## Quality Gates & Validation

- Lint (fails unless addressed): `pnpm lint` runs `tsc --noEmit` + ESLint.
- Tests: `pnpm test:ci` (Jest CI config) succeeds headlessly without services and takes ~2–3 minutes; script prints `coverage-ci/lcov.info` to stdout—redirect output if noise is an issue (`pnpm test:ci > /tmp/jest.log`). Targeted suites: `pnpm run test:ci path/to/spec`. For quick verification, use `pnpm run test:ci:no:coverage` (skips coverage collection).
- Schema contract: regenerate and diff before committing schema-impacting work:
  1. `pnpm run schema:print`
  2. `pnpm run schema:sort`
  3. `pnpm run schema:diff` (requires `tmp/prev.schema.graphql`; fetch from base branch if absent).
  4. Inspect `change-report.json` (`BREAKING` entries need CODEOWNER review comment with `BREAKING-APPROVED`).
  5. Optional validation: `pnpm run schema:validate`.
- Baseline automation: merges to `develop` trigger `schema-baseline.yml` to regenerate `schema-baseline.graphql`, publish a diff summary, and push a signed commit when changes exist. To preview the summary locally, run `pnpm exec ts-node scripts/schema/publish-baseline.ts --report change-report.json` after generating a diff.
- Database migrations: `pnpm run migration:generate -n <Name>` (requires DSN env vars), `pnpm run migration:run`, `pnpm run migration:revert`. Validation harness `.scripts/migrations/run_validate_migration.sh` snapshots DB, applies migration, exports CSVs, compares to reference, then restores backup.
- Other tooling: `pnpm run migration:validate` (shell script), `pnpm run circular-dependencies` (requires built `dist`), `pnpm format` for Prettier.

## Layout & Key Paths

- Entry point: `src/main.ts` bootstraps Nest `AppModule`, configures GraphQL uploads, RabbitMQ microservices, Helmet, cookie parser, and `/graphiql` UI.
- `src/` structure:
  - `domain/*`: aggregates, repositories, domain services (business rules live here per constitution).
  - `services/api-*`: GraphQL + REST resolvers/controllers bridging domain.
  - `services/adapters`, `services/infrastructure`: external integration layers (e.g. SSI, file storage, Rabbit workers).
  - `common/`, `core/`, `config/`, `library/`: cross-cutting utilities, bootstrap, configuration modules.
  - `platform/` & `platform-admin/`: platform-scoped modules and admin operations.
- Tests in `test/` mirror production code (`functional/e2e`, `functional/integration`, `unit`, `config/jest.*`).
- Specs & plans reside in `specs/00x-*`. Update or create spec artifacts before product changes.
- Compose files: `quickstart-services*.yml`, `quickstart-wallet-manager.yml` orchestrate dependencies. Docker settings assume `.env.docker` for credentials.
- Config & tooling: `nest-cli.json`, `tsconfig*.json`, `eslint.config.js`, `alkemio.yml`, `scripts/schema/*.ts`, `.scripts/tests/*.ts`, `.scripts/migrations/*.sh`.

## CI & Release Signals

- GitHub Actions:
  - `schema-contract.yml` runs pnpm install, generates schema snapshot (light bootstrap), diffs vs baseline, posts sticky PR comment, and fails on unapproved BREAKING/PREMATURE_REMOVAL issues.
  - `schema-baseline.yml` runs on merges to `develop`, regenerates the baseline snapshot, uploads diff artifacts, and auto-commits a signed `schema-baseline.graphql` update or notifies CODEOWNERS when it fails.
  - `build-release-docker-hub.yml` builds and publishes Docker images (Node 20 + pnpm caches).
  - `build-deploy-k8s-*.yml` target dev/sandbox/test Hetzner clusters after container build.
  - `trigger-e2e-tests.yml` dispatches downstream full-stack tests.
- Legacy Travis badge remains in README; GitHub Actions are the authoritative CI. Expect schema gate + build workflows to run on PRs touching `src/**`, schema artifacts, or package manifests.

## Operational Tips

- Prefer MCP servers (`github`, `context7`, `fetch`) before shell commands; Git operations must be signed.
- When running compose, ensure ports 3000/4000/4001/3306/5672 are free; adjust via environment if conflicts arise.
- For new GraphQL surface area, align with `docs/Pagination.md`, enforce DTO validation, and emit domain events instead of direct repository writes.
- Update `schema.graphql` and related artifacts only when schema changes occur; otherwise leave untouched to avoid noisy diffs.
- Let `schema-baseline.yml` manage `schema-baseline.graphql`; if automation is down, coordinate with CODEOWNERS before pushing manual updates.
- Keep migrations idempotent and include rollback notes inline.
- Trust this guide. Only search or explore when information here is missing or demonstrably outdated.
