# Quickstart: Unit Tests for src/services/ai-server

## Run Tests

```bash
# Run all ai-server tests
npx vitest run src/services/ai-server

# Run with coverage
npx vitest run --coverage src/services/ai-server

# Run a specific test file
npx vitest run src/services/ai-server/ai-persona/ai.persona.service.authorization.spec.ts
```

## Verify

```bash
pnpm lint
pnpm exec tsc --noEmit
```
