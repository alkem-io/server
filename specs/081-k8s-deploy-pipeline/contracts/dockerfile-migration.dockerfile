###############
# Stage 1: Builder
# Compiles TypeScript with all dependencies
###############
FROM node:22.21.1-alpine AS builder
WORKDIR /app

# Install pnpm (pinned to repo version)
RUN npm i -g pnpm@10.17.1

# Install all dependencies (dev included — needed to compile TypeScript)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY tsconfig.json tsconfig.build.json alkemio.yml ./
COPY src ./src
RUN pnpm run build

# Prune dev dependencies before copying to final stage
RUN pnpm prune --prod

###############
# Stage 2: Migration runner
# Alpine (not distroless): pnpm must be on PATH to invoke migration:run script
# One-shot container — runs pnpm run migration:run and exits
###############
FROM node:22.21.1-alpine
WORKDIR /app

# pnpm required to execute the migration:run script
RUN npm i -g pnpm@10.17.1

# Copy compiled output and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/alkemio.yml ./

CMD ["pnpm", "run", "migration:run"]
