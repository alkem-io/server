# syntax=docker/dockerfile:1.7
ARG VARIANT="20"
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        default-mysql-client \
        postgresql-client \
        redis-tools \
        jq \
        iputils-ping \
        netcat-openbsd \
        git-lfs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

USER node

ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:/home/node/.local/bin:${PATH}"

RUN npm install -g @modelcontextprotocol/server-github@2025.4.8 \
    @upstash/context7-mcp@1.0.1

RUN python3 -m pip install --no-cache-dir --user --break-system-packages mcp-tavily==0.1.10
