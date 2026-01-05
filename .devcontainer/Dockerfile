FROM node:20.15.1-bookworm

# Install pnpm and Claude Code CLI globally
RUN npm install -g pnpm@10.17.1 @anthropic-ai/claude-code

# Install git, GitHub CLI, and other useful tools
# Note: sudo removed for security - container isolation is the security boundary
RUN apt-get update && apt-get install -y \
    git \
    postgresql-client \
    curl \
    jq \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Set pnpm store directory for better caching (use node user's home for UID 1000)
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Create workspace directory with open permissions
RUN mkdir -p /workspaces/server && chmod 777 /workspaces /workspaces/server

# Ensure node user home directory exists with pnpm store and Claude config
RUN mkdir -p /home/node/.claude /home/node/.local/share/pnpm && chown -R 1000:1000 /home/node

WORKDIR /workspaces/server