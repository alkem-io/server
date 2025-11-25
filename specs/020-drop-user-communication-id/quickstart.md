# Quickstart

**Feature**: Drop User Communication ID

## Prerequisites
- Database running (`pnpm run start:services`).
- Matrix adapter (mock or real) configured to accept `agentId`.

## Migration
1. Generate migration: `pnpm run migration:generate -n DropCommunicationId`
2. Run migration: `pnpm run migration:run`

## Verification
1. Check `User` table: `DESCRIBE user;` (ensure `communicationId` is gone).
2. Check `VirtualContributor` table.
3. Check `Organization` table.
4. Run tests: `pnpm test`
