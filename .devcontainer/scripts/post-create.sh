#!/usr/bin/env bash
set -euo pipefail

corepack enable
corepack prepare pnpm@10.17.1 --activate

# Ensure pnpm store sits on the dedicated volume for faster installs
pnpm config set store-dir /home/node/.local/share/pnpm/store --global

pnpm install --frozen-lockfile
