<!-- Implements constitution & agents.md. Does not introduce new governance. -->

# Copilot Onboarding Guide

## Repository Snapshot

- Purpose: NestJS GraphQL server for the Alkemio collaboration platform; exposes `http://localhost:3000/graphql` and orchestrates domain + integration services.
- Stack: TypeScript, Node 20 LTS (Volta pins 20.15.1), pnpm 10.17.1 via Corepack, NestJS, TypeORM (MySQL), Apollo Server, RabbitMQ queues, Elastic APM, Ory Kratos/Oathkeeper for auth.
- Scale: ~3k TypeScript files; key roots include `src/`, `test/`, `docs/`, `.specify/`, `scripts/`, `specs/00x-*`, `quickstart-*.yml`, `Dockerfile`, `package.json`, `pnpm-lock.yaml`.
- Docs: `docs/Developing.md`, `docs/Running.md`, `docs/QA.md`, `docs/DataManagement.md`, `docs/Design.md` hold authoritative setup, architecture, QA, and migration guidance. Authorization flows and decision trees live in `docs/authorization-forest.md` and credential semantics in `docs/credential-based-authorization.md`.

## Governance & Workflow

- Specification-Driven Development is mandatory for feature work. Read `[.specify/memory/constitution.md](../.specify/memory/constitution.md)` first; it defines quality gates, module boundaries, and testing expectations.
- Artifacts live under `specs/<NNN-slug>/` (plan, spec, checklist, tasks). Follow the canonical progression: `/spec` → `/clarify` → `/plan` → `/checklist` → `/tasks` → `/implement` → `/stabilize` → `/done`.
- Classify work per [`agents.md`](../agents.md): default to the Agentic path for scoped changes (≤ ~400 LOC with known outcomes) and escalate to Full SDD when contracts, migrations, or high ambiguity enter the picture.
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
- Baseline automation: merges to `develop` trigger `schema-baseline.yml` to regenerate `schema-baseline.graphql`, publish a diff summary, and open a signed PR (branch `schema-baseline/<run-id>`) from the automation account when changes exist. To preview the summary locally, run `pnpm exec ts-node scripts/schema/publish-baseline.ts --report change-report.json` after generating a diff.
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
  - `schema-baseline.yml` runs on merges to `develop`, regenerates the baseline snapshot, uploads diff artifacts, and raises a signed pull request with the refreshed `schema-baseline.graphql` when it detects changes (falling back to CODEOWNER notification on failure).
  - `build-release-docker-hub.yml` builds and publishes Docker images (Node 20 + pnpm caches).
  - `build-deploy-k8s-*.yml` target dev/sandbox/test Hetzner clusters after container build.
  - `trigger-e2e-tests.yml` dispatches downstream full-stack tests.
- Legacy Travis badge remains in README; GitHub Actions are the authoritative CI. Expect schema gate + build workflows to run on PRs touching `src/**`, schema artifacts, or package manifests.

## Operational Tips

- Always prefer **MCP server tools** when possible.
  - Fall back to direct terminal or console commands only if no MCP capability exists or is insufficient.
  - Use the most specific MCP server before any generic one.
    - Priority order:
      1. Domain-specific MCP servers (`github`, `context7`, `fetch`)
      2. Generic web search MCP servers (`tavily`, `brave`)
    - Selection rules:
      - Requests involving `https://github.com/alkem-io/` → use **GitHub MCP**.
      - Use **Context7 MCP** for factually correct or verified information before falling back to search MCPs.
      - Use **Tavily** or **Brave** only when developer documentation is unavailable elsewhere.
    - Examples:
      - “List open PRs in alkem-io/server” → **GitHub MCP**
      - "How do I use the useSWR hook with TypeScript in a Next.js application, specifically for data fetching with client-side caching and revalidation, according to the latest SWR documentation?" → Context7 MCP, fallback to Tavily
- Feedback Loops:
  - Prefer MCP servers supporting **feedback and validation** (e.g., GitHub comments, Context7 evaluation).
  - Use them to cross-check and refine responses before completion.
- For Git operations, **all commits must be signed**.
- When running compose, ensure ports 3000/4000/4001/3306/5672 are free; adjust via environment if conflicts arise.
- For new GraphQL surface area, align with `docs/Pagination.md`, enforce DTO validation, and emit domain events instead of direct repository writes.
- Update `schema.graphql` and related artifacts only when schema changes occur; otherwise leave untouched to avoid noisy diffs.
- Let `schema-baseline.yml` manage `schema-baseline.graphql`; if automation is down, coordinate with CODEOWNERS before pushing manual updates.
- Keep migrations idempotent and include rollback notes inline.
- Trust this guide. Only search or explore when information here is missing or demonstrably outdated.

## Active Technologies
- TypeScript 5.3 on Node.js 20.15.1 (NestJS) + NestJS 10, TypeORM 0.3, Apollo GraphQL 4, Express, Ory Kratos Admin API client (014-kratos-authentication-id-linking)
- MySQL 8.0 via TypeORM (014-kratos-authentication-id-linking)
- TypeScript 5.x on Node.js 20 (NestJS server) + NestJS 10, TypeORM 0.3, GraphQL/Apollo Server, MySQL 8 (016-drop-account-upn)
- MySQL 8 via TypeORM entities and migrations (016-drop-account-upn)
- TypeScript 5.3 on Node.js 20.15.1 (Volta pinned) + NestJS 10 (DI, Scheduler), TypeORM/MySQL, ConfigService, Synapse integration services, Jest for tests (017-drop-session-sync)
- MySQL 8 (application DB) + legacy Kratos DB (read-only references to be removed) (017-drop-session-sync)
- TypeScript 5.x on Node.js 20 (NestJS server) + NestJS, existing REST controller stack, identity resolution services already used by `/rest/internal/identity/resolve` (018-identity-resolve-agent-id)
- Existing application database and identity stores (no new storage required) (018-identity-resolve-agent-id)

- TypeScript 5.x on Node.js 20 (per repository toolchain) + NestJS server, existing CI runner stack, SonarQube at https://sonarqube.alkem.io (015-sonarqube-analysis)
- N/A (SonarQube stores analysis; server DB not impacted by this feature) (015-sonarqube-analysis)

- TypeScript 5.3, Node.js 20.15.1 (Volta-pinned), executed via ts-node + NestJS 10.x, TypeORM 0.3.x, Apollo Server 4.x, GraphQL 16.x, class-validator, class-transformer (013-timeline-comment-notification)
- MySQL 8.0 with `mysql_native_password` authentication (013-timeline-comment-notification)

- TypeScript 5.3 (ts-node) executed on Node 20.x via GitHub Actions + pnpm 10.17.1, `actions/checkout@v4`, `actions/setup-node@v4`, `crazy-max/ghaction-import-gpg@v6`, `actions/github-script@v7`, repository schema scripts (`generate-schema.snapshot.ts`, `diff-schema.ts`) (012-generate-schema-baseline)
- N/A – workflow operates on repository working tree only (012-generate-schema-baseline)

## Recent Changes

- 012-generate-schema-baseline: Added TypeScript 5.3 (ts-node) executed on Node 20.x via GitHub Actions + pnpm 10.17.1, `actions/checkout@v4`, `actions/setup-node@v4`, `crazy-max/ghaction-import-gpg@v6`, `actions/github-script@v7`, repository schema scripts (`generate-schema.snapshot.ts`, `diff-schema.ts`)
