###############
# Single-stage build (includes sources & dev tooling for migrations)
###############
FROM node:22.21.1-alpine
WORKDIR /usr/src/app

ARG GRAPHQL_ENDPOINT_PORT_ARG=4000
ARG ENV_ARG=production
ENV NODE_ENV=$ENV_ARG
ENV GRAPHQL_ENDPOINT_PORT=$GRAPHQL_ENDPOINT_PORT_ARG
ENV NODE_OPTIONS=--max-old-space-size=2048

# Install pnpm (locked version to align with repo)
RUN npm i -g pnpm@10.17.1

# Dependencies (full set so ts-node & dev scripts work)
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy sources & build
COPY tsconfig.json tsconfig.build.json alkemio.yml ./
COPY src ./src
RUN pnpm run build

# Optional pruning: remove dev deps after build if you want (commented out)
# RUN pnpm prune --prod

# Wait script for orchestrated startup
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

EXPOSE ${GRAPHQL_ENDPOINT_PORT_ARG}
CMD ["node", "dist/main.js"]
