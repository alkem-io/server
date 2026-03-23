###############
# Stage 1: Builder
# Compiles TypeScript and prunes dev dependencies
###############
FROM node:22.21.1-alpine AS builder
WORKDIR /app

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production
ENV NODE_ENV=$ENV_ARG
ENV GRAPHQL_ENDPOINT_PORT=$GRAPHQL_ENDPOINT_PORT_ARG

# Install pnpm (pinned to repo version)
RUN npm i -g pnpm@10.17.1

# Install all dependencies (dev included — needed for build)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy sources and build
COPY tsconfig.json tsconfig.build.json alkemio.yml ./
COPY src ./src
RUN pnpm run build

# Prune dev dependencies — only production deps go to the runtime stage
RUN pnpm prune --prod

###############
# Stage 2: Runtime (distroless — no shell, no package manager)
# Principle 9: Container images must be reproducible with explicit base tags
###############
FROM gcr.io/distroless/nodejs22-debian13:nonroot
WORKDIR /app

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ENV GRAPHQL_ENDPOINT_PORT=$GRAPHQL_ENDPOINT_PORT_ARG
# NODE_OPTIONS is read by the node runtime — works in distroless
ENV NODE_OPTIONS=--max-old-space-size=2048

# Copy only the compiled output and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/alkemio.yml ./

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}

# distroless/nodejs22 ENTRYPOINT is already ["node"]
# CMD must be the script path — NOT "node dist/main.js" (would double-invoke node)
CMD ["dist/main.js"]
