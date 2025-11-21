# Dev Container Notes

This development container is tailored for the Alkemio server stack and mirrors the compose setup documented in `docs/Running.md`.

## What you get

- Node.js 20 with Corepack and pnpm 10.17.1 prepped.
- CLI tooling: MySQL/PostgreSQL clients, Redis tools, jq, git-lfs, and networking utilities.
- Preinstalled MCP servers for GitHub, Context7, and Tavily.
- Automatic installation of project dependencies on first start.
- Full dependency stack (MySQL, Kratos, Hydra, Synapse, RabbitMQ, etc.) via the bundled compose file.

## Required secrets

Provide the following environment variables (for example via `.devcontainer/devcontainer.env` or through your VS Code secret storage):

- `GITHUB_PERSONAL_ACCESS_TOKEN` – required by the GitHub MCP server.
- `TAVILY_API_KEY` – required by the Tavily MCP server.

The Context7 MCP server does not need credentials for public documentation access.

## Usage tips

- The container uses two ports for the application runtime: `4000` (local dev) and `4001` (compose stack). Avoid running competing processes on the host.
- All dependent services start automatically. If you need a lighter stack, adjust the `runServices` section in `devcontainer.json` before rebuilding.
- The pnpm store is persisted in the `pnpm-store` volume; remove it with `docker volume rm server_dc_pnpm-store` if you want a clean install.
- Rebuild the container after modifying Dockerfile or dependency tooling: `Dev Containers: Rebuild Container` from the VS Code command palette.
