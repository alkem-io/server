FROM node:22.21.1-alpine

# Install pnpm and Claude Code CLI globally
RUN npm install -g pnpm@10.17.1 @anthropic-ai/claude-code

# Install git, GitHub CLI, and other useful tools
# Note: sudo removed for security - container isolation is the security boundary
RUN apk add --no-cache \
    git \
    postgresql-client \
    curl \
    jq \
    github-cli

# Set pnpm store directory for better caching (use node user's home for UID 1000)
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Create workspace directory with open permissions
RUN mkdir -p /workspaces/server && chmod 777 /workspaces /workspaces/server

# Ensure node user home directory exists with pnpm store and Claude config
RUN mkdir -p /home/node/.claude /home/node/.local/share/pnpm && chown -R 1000:1000 /home/node

WORKDIR /workspaces/server