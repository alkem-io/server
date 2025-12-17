FROM node:20.15.1-bookworm

# Install pnpm globally (matching version from package.json)
RUN npm install -g pnpm@10.17.1

# Install git, GitHub CLI, sudo, and other useful tools
RUN apt-get update && apt-get install -y \
    git \
    postgresql-client \
    curl \
    sudo \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/* \
    && echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node

# Set pnpm store directory for better caching
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Create workspace directory with open permissions
RUN mkdir -p /workspaces/server && chmod 777 /workspaces /workspaces/server

WORKDIR /workspaces/server