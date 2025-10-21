###############
# Builder stage
###############
FROM node:20.15.1-alpine AS builder
WORKDIR /usr/src/app

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production

# Install pnpm (locked version to align with repo)
RUN npm i -g pnpm@10.17.1

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json alkemio.yml ./
COPY src ./src

RUN pnpm run build

###############
# Runtime stage
###############
FROM node:20.15.1-alpine AS runtime
WORKDIR /usr/src/app

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production
ENV NODE_ENV=$ENV_ARG
ENV GRAPHQL_ENDPOINT_PORT=$GRAPHQL_ENDPOINT_PORT_ARG
ENV NODE_OPTIONS=--max-old-space-size=2048

# Copy only production node_modules to slim image
COPY package*.json pnpm-lock.yaml ./
RUN npm i -g pnpm@10.17.1 \
	&& pnpm install --prod --frozen-lockfile \
	&& pnpm store prune

# Copy build artifacts & config
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/alkemio.yml ./alkemio.yml

# Add wait script (kept last to leverage layer cache for app code changes)
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["node", "dist/main.js"]
