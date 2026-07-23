# Pushing images to dockerhub

We have automated the creation and deployment of containers to docker hub via a github action.

To automaticly trigger the build up to dockerhub the following steps should be taken:

- Ensure that the code that you would like to create the container from is pushed / merged into the `develop` branch.
- Create a github release and tag it with the appropriate version number ie. `v0.1.3`
- Go to github actions and view the `push to docker` action to see if everything ran correctly.

## Runtime image shape (distroless, non-root)

Since `workspace#026-distroless-runtime-images`, the production image is built by a
three-stage `Dockerfile`:

1. **`builder`** — `node:22.21.1-bookworm-slim` (glibc/Debian 12, matches the repo's
   Volta pin). Installs the full dependency set (incl. dev) and compiles TypeScript
   (`pnpm run build` → `dist/`).
2. **`proddeps`** — the **same glibc base**, a fresh `pnpm install --frozen-lockfile --prod`.
   This stage is never skipped or copied from an Alpine/musl layer: native modules
   (`sharp`) must be installed on the exact glibc runtime they'll execute on, or
   they silently fail to load (musl artifacts are ABI-incompatible with glibc).
   `package.json`'s `pnpm.supportedArchitectures.libc: ["glibc"]` reinforces this by
   preventing musl-variant optional dependencies from ever being resolved.
3. **`runtime`** — `gcr.io/distroless/nodejs22-debian12:nonroot`, digest-pinned. No
   shell, no package manager, no `/wait` binary, no `src/` sources, no dev
   dependencies. Runs as UID 65532 (`nonroot`). Entrypoint is the distroless `node`
   binary; `CMD ["dist/main.js"]`.

Both base image tags are pinned by digest in the `Dockerfile` header comment.
Re-resolve with `docker buildx imagetools inspect <image>:<tag>` and update the tag
and digest together when bumping either base.

### Running database migrations against this image

The runtime image has no shell and no `pnpm`. Migrations run via a direct,
compiled invocation of the TypeORM CLI:

```bash
node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/migration.config.js
```

from `WORKDIR /usr/src/app`, as the image's non-root user, with zero shell
involvement. This is the `server-migration-entrypoint` contract consumed by
dev-orchestration's migration CronJob and, at release time, by
infrastructure-operations (see workspace spec `026-distroless-runtime-images`,
risk R-8). The command string above must stay copy-paste identical to whatever
consumers invoke.

The TypeORM CLI config (`src/config/typeorm.cli.config.run.ts`) resolves its
`migrations` glob relative to `__dirname`, not the process CWD, so the same
config file serves both execution modes:

- **ts-node (developer flow)**: `__dirname` is `src/config` → resolves
  `src/migrations/*.ts`. `pnpm run migration:run|revert|show|generate` is
  unaffected by this change.
- **compiled (this image)**: `__dirname` is `dist/config` → resolves
  `dist/migrations/*.js`.

### What was removed from the runtime image

- The `/wait` binary (`ufoscout/docker-compose-wait`) — verified consumer-safe:
  no Kubernetes manifest invokes the server image's own `/wait`; the server
  Deployment's readiness gating uses a separate `groundnuty/k8s-wait-for`
  initContainer.
- `pnpm`, `ts-node`, `tsconfig-paths` — these are developer/CI-only tools now
  declared under `devDependencies` (they were previously miscategorized as
  production `dependencies`, which is what let them leak into a full
  `pnpm install --prod`).
- The full `src/` TypeScript tree and all `devDependencies`.

### Persisted regression scripts

- `.docker/distroless-image-smoke.sh <image>` — asserts non-root/no-shell/no-`/wait`,
  absence of `src/`/`ts-node`/`pnpm`, that `sharp` loads (the glibc native-module
  sentinel), and enforces the ≥40% image-size reduction budget (SC-001).
- `.docker/distroless-migration-smoke.sh <image>` — runs the compiled migration
  entrypoint above against a throwaway PostgreSQL 17.5 container and asserts the
  applied-migration count matches the compiled `dist/migrations/*.js` count, with
  zero pending migrations afterward.

Run both against any locally built image before publishing:

```bash
docker build -t alkemio/server:local .
.docker/distroless-image-smoke.sh alkemio/server:local
.docker/distroless-migration-smoke.sh alkemio/server:local
```
