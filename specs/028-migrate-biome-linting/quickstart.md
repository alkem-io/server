# Quickstart: Biome Linting and Formatting

**Feature**: 028-migrate-biome-linting
**Date**: 2026-01-18

This guide helps developers get started with Biome after the migration from ESLint + Prettier.

---

## What Changed?

- **ESLint + Prettier** → **Biome** (single unified tool)
- Configuration: `eslint.config.js` + `.prettierrc` → `biome.json`
- VS Code Extension: ESLint + Prettier → Biome

---

## IDE Setup (VS Code)

### 1. Install the Biome Extension

Search for "Biome" in VS Code Extensions or run:
```
ext install biomejs.biome
```

### 2. Disable/Uninstall Conflicting Extensions

- Disable or uninstall the ESLint extension (optional, won't conflict)
- Disable or uninstall the Prettier extension (recommended to avoid conflicts)

### 3. Verify Settings

The repository includes `.vscode/settings.json` with Biome as the default formatter. If you have user-level overrides, ensure they don't conflict:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```

---

## CLI Commands

### Check (lint + format validation)

```bash
# Check all files
pnpm lint

# Check specific directory
pnpm exec biome check src/domain/

# Check specific file
pnpm exec biome check src/main.ts
```

### Fix (apply safe fixes)

```bash
# Fix all files
pnpm lint:fix

# Fix specific directory
pnpm exec biome check --write src/domain/
```

### Format Only

```bash
# Format all files
pnpm format

# Format specific file
pnpm exec biome format --write src/main.ts
```

---

## Ignoring Rules

### Inline Ignore (single line)

```typescript
// biome-ignore lint/suspicious/noExplicitAny: Required for legacy API
const legacyHandler: any = getLegacyHandler();
```

### Inline Ignore (next line)

```typescript
// biome-ignore lint/correctness/noUnusedVariables: Used in tests
const testHelper = createTestHelper();
```

### File-Level Ignore

Add at the top of the file:
```typescript
// biome-ignore-all lint/suspicious/noConsole: Debug utility file
```

---

## Rule Differences from ESLint

### Unused Variables

Biome has the same underscore prefix convention as the old ESLint config:
```typescript
// Valid - underscore prefix marks intentionally unused
function handler(_event: Event, data: Data) {
  return process(data);
}
```

### Console Statements

Now enforced at error level (was warning in development):
```typescript
// This will error - use biome-ignore if needed
console.log('debug');

// Preferred: Use the logger
this.logger.verbose('debug info', LogContext.DOMAIN);
```

### Debugger Statements

Now enforced at error level:
```typescript
// This will error - remove before commit
debugger;
```

### Import Type Conversion

The `useImportType` rule is **disabled** for NestJS compatibility. NestJS uses classes as dependency injection tokens at runtime, so they must remain as value imports (not type-only imports):
```typescript
// Correct - value import (required for NestJS DI)
import { ConfigService } from '@nestjs/config';

// Incorrect - would break NestJS dependency injection
import type { ConfigService } from '@nestjs/config';
```

---

## Pre-commit Hook

The pre-commit hook (via Husky + lint-staged) now runs Biome instead of ESLint + Prettier:

```bash
# What happens on commit:
biome check --write --no-errors-on-unmatched <staged-files>
```

If your commit is blocked, run:
```bash
pnpm lint:fix
```

---

## Troubleshooting

### "File is ignored" errors

Check if the file matches an ignore pattern in `biome.json`. Common ignored paths:
- `src/migrations/**`
- `dist/**`
- `node_modules/**`

### Format-on-save not working

1. Check VS Code Output panel (View → Output → Biome)
2. Verify `editor.defaultFormatter` is set to `biomejs.biome`
3. Ensure the file type is supported (`.ts`, `.tsx`, `.js`, `.json`)

### Different formatting between local and CI

Run locally with CI mode to match:
```bash
pnpm exec biome ci src/
```

### Extension not finding biome.json

1. Reload VS Code window (Cmd/Ctrl + Shift + P → "Reload Window")
2. Check that `biome.json` exists at repository root

---

## Performance

Biome is significantly faster than ESLint + Prettier.

### Benchmarks (measured on ~2323 files)

| Operation | Before (ESLint + Prettier) | After (Biome) | Improvement |
|-----------|---------------------------|---------------|-------------|
| Full lint | ~14 seconds | ~0.28 seconds | **~51x faster** |
| Prettier check | ~0.25 seconds | (included above) | - |
| Single file | ~1-2 seconds | ~4ms | **~300x faster** |
| Format on save | Perceptible delay | Instant | - |

*Benchmarks run on Alkemio Server codebase with 2323 TypeScript files.*

---

## Resources

- [Biome Documentation](https://biomejs.dev)
- [Biome Rules Reference](https://biomejs.dev/linter/rules/)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
