# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.15.1
ARG PNPM_VERSION=10.17.1
ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG WAIT_FOR_IT_VERSION=2.9.0

##############################
# Dependencies & build stage #
##############################
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /usr/src/app

ENV NODE_OPTIONS=--max-old-space-size=2048

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl build-essential python3 \
 && npm install -g pnpm@${PNPM_VERSION} \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json alkemio.yml ./
COPY src ./src
RUN pnpm run build

# Strip dev-only dependencies to keep runtime lean
RUN pnpm prune --prod

# Ship the orchestration wait helper so compose stacks can still gate startup
RUN curl -sSL https://github.com/ufoscout/docker-compose-wait/releases/download/${WAIT_FOR_IT_VERSION}/wait \
    -o /usr/local/bin/wait \
 && chmod +x /usr/local/bin/wait

#########################
# Minimal runtime image #
#########################
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /usr/src/app

ARG GRAPHQL_ENDPOINT_PORT_ARG
ENV NODE_ENV=production \
    GRAPHQL_ENDPOINT_PORT=${GRAPHQL_ENDPOINT_PORT_ARG} \
    NODE_OPTIONS=--max-old-space-size=2048

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./
COPY --from=builder /usr/src/app/alkemio.yml ./alkemio.yml
COPY --from=builder /usr/local/bin/wait /wait

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["dist/main.js"]
