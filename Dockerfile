###############################################################################
# workspace#026-distroless-runtime-images
#
# Three-stage build producing a distroless, non-root runtime image:
#   1. builder  — glibc (Debian bookworm), installs full deps, compiles TS
#   2. proddeps — glibc, fresh `pnpm install --prod` (NEVER copied from an
#                 Alpine/musl layer — this is the sentinel that keeps native
#                 modules such as `sharp` glibc-linked; see spec R-2)
#   3. runtime  — gcr.io/distroless/nodejs22-debian12:nonroot: no shell, no
#                 package manager, no sources, no dev deps, no /wait binary.
#
# Base images are pinned by digest (resolved via
# `docker buildx imagetools inspect <image>:<tag>`). Re-resolve and update
# both the tag *and* the digest together when bumping.
#
#   node:22.21.1-bookworm-slim   (matches Volta pin 22.21.1, glibc/Debian 12)
#     digest: sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c
#   gcr.io/distroless/nodejs22-debian12:nonroot
#     digest: sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e
#
# Migrations: the compiled entrypoint consumers (dev-orchestration CronJob,
# infra-ops at release time — spec R-8) MUST invoke:
#   node ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/migration.config.js
# from WORKDIR /usr/src/app, with zero shell involvement. This is the
# `server-migration-entrypoint` contract (see workspace repos.yaml).
###############################################################################

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production

###############################################################################
# Stage 1: builder — full deps (incl. dev), compile TypeScript -> dist/
###############################################################################
FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS builder
WORKDIR /usr/src/app

# Install pnpm (locked version to align with repo)
RUN npm i -g pnpm@10.17.1

# Dependencies (full set so the Nest CLI build toolchain is available)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy sources & build
COPY tsconfig.json tsconfig.build.json nest-cli.json alkemio.yml ./
COPY src ./src
RUN pnpm run build
# postbuild (package.json) already copies alkemio.yml -> dist/alkemio.yml

###############################################################################
# Stage 2: proddeps — FRESH glibc install of production deps only.
# NEVER copy node_modules from an Alpine/musl-built layer into this stage or
# the runtime stage below — `sharp`'s prebuilt binaries are ABI-specific and
# a musl artifact silently segfaults (or fails to load) on glibc (spec R-2,
# edge case "musl artifact leakage"). This stage installs on the SAME glibc
# base as `builder`, so `sharp` resolves `@img/sharp-linux-x64` (glibc).
###############################################################################
FROM node:22.21.1-bookworm-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS proddeps
WORKDIR /usr/src/app

RUN npm i -g pnpm@10.17.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

###############################################################################
# Stage 3: runtime — distroless, non-root (UID 65532), no shell, no package
# manager, no sources, no dev dependencies, no /wait binary (removal verified
# consumer-safe: the server Deployment's readiness gating uses a
# `groundnuty/k8s-wait-for` initContainer, not the image's own /wait — spec
# C-2).
###############################################################################
FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e AS runtime

ARG GRAPHQL_ENDPOINT_PORT_ARG
ARG ENV_ARG
ENV NODE_ENV=$ENV_ARG
ENV GRAPHQL_ENDPOINT_PORT=$GRAPHQL_ENDPOINT_PORT_ARG
ENV NODE_OPTIONS=--max-old-space-size=2048
# US5-AS2 fix: the distroless base sets ENTRYPOINT ["/nodejs/bin/node"], but a
# bare k8s `command:` override (dev-orchestration's migration CronJob invokes
# the literal `node ./node_modules/typeorm/cli.js ...`, per the
# server-migration-entrypoint contract) REPLACES that entrypoint entirely, so
# the container runtime resolves "node" via PATH lookup before exec — which
# fails ("exec: \"node\": executable file not found in $PATH") because
# distroless's default PATH does not include /nodejs/bin. Prepending it here
# makes the documented literal `node ...` command resolve for any bare
# command: override, without requiring every consumer to know the absolute
# binary path.
ENV PATH="/nodejs/bin:${PATH}"

WORKDIR /usr/src/app

# package.json is required at runtime: the `_moduleAliases` field
# (module-alias, consumed by src/config/aliases.ts) resolves `@src` against
# it when dist/main.js boots.
COPY --from=proddeps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/alkemio.yml ./alkemio.yml

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}

USER nonroot
CMD ["dist/main.js"]
