# Quickstart: Running Domain Space Tests

```bash
# Run all space domain tests
npx vitest run src/domain/space

# Run with coverage
npx vitest run --coverage --coverage.include='src/domain/space/**' src/domain/space

# Run a specific test file
npx vitest run src/domain/space/space/space.service.platform.roles.access.spec.ts

# Lint check
pnpm lint

# Type check
pnpm exec tsc --noEmit
```
