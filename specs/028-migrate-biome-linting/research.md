# Research: Migrate to Biome for Linting and Formatting

**Feature**: 028-migrate-biome-linting
**Date**: 2026-01-18
**Status**: Complete

## Executive Summary

Biome is a high-performance, Rust-based toolchain that unifies linting and formatting into a single tool, replacing both ESLint and Prettier. It offers 340+ lint rules (many ported from ESLint/typescript-eslint), near-instant performance, and built-in migration tooling.

---

## Research Findings

### 1. Migration Tooling

**Decision**: Use Biome's built-in migration commands for initial configuration generation

**Rationale**: Biome provides dedicated migration commands that read existing ESLint and Prettier configurations and generate equivalent `biome.json` settings:

```bash
# Migrate ESLint rules
npx @biomejs/biome migrate eslint --write --include-inspired

# Migrate Prettier formatting options
npx @biomejs/biome migrate prettier --write
```

**Alternatives Considered**:
- Manual rule mapping: More time-consuming and error-prone
- Gradual migration with parallel tooling: Rejected per spec (hard cutover required)

---

### 2. ESLint Rule Mapping

**Decision**: Map current ESLint rules to Biome equivalents with documented gaps

| Current ESLint Rule | Biome Equivalent | Notes |
|---------------------|------------------|-------|
| `@typescript-eslint/no-unused-vars` | `correctness/noUnusedVariables` + `correctness/noUnusedFunctionParameters` | Biome natively supports `_` prefix ignore pattern |
| `@typescript-eslint/no-explicit-any` | `suspicious/noExplicitAny` | Currently disabled in project |
| `@typescript-eslint/explicit-function-return-type` | N/A (no equivalent) | Currently disabled - no migration needed |
| `@typescript-eslint/explicit-module-boundary-types` | N/A | Currently disabled - no migration needed |
| `@typescript-eslint/interface-name-prefix` | N/A (deprecated rule) | Currently disabled - no migration needed |
| `quotes` | `javascript.formatter.quoteStyle` | Formatter option, not lint rule |
| `no-console` | `suspicious/noConsole` | Biome has equivalent |
| `no-debugger` | `suspicious/noDebuggerStatement` | Biome has equivalent |
| `no-multiple-empty-lines` | Formatter handles this | No lint rule needed |
| `plugin:prettier/recommended` | Biome formatter | Unified in Biome |

**Rationale**: Most disabled rules require no migration. Active rules have direct Biome equivalents.

**Unmapped Rules (requiring documentation)**:
- Environment-based rule severity (`env(prod, dev)` pattern): Biome doesn't support dynamic severity. Will use production settings by default.

---

### 3. Prettier Configuration Mapping

**Decision**: Direct mapping of all Prettier options to Biome formatter settings

| Prettier Option | Biome Equivalent | Value |
|-----------------|------------------|-------|
| `singleQuote: true` | `javascript.formatter.quoteStyle` | `"single"` |
| `trailingComma: "es5"` | `javascript.formatter.trailingCommas` | `"es5"` |
| `tabWidth: 2` | `formatter.indentWidth` | `2` |
| `useTabs: false` | `formatter.indentStyle` | `"space"` |
| `semi: true` | `javascript.formatter.semicolons` | `"always"` |
| `bracketSpacing: true` | `javascript.formatter.bracketSpacing` | `true` |
| `arrowParens: "avoid"` | `javascript.formatter.arrowParentheses` | `"asNeeded"` |

**Rationale**: Biome provides direct equivalents for all Prettier options in use.

---

### 4. Ignore Patterns Consolidation

**Decision**: Merge ESLint and Prettier ignore patterns into unified Biome `files.ignore`

**Current Patterns (from eslint.config.js and .prettierignore)**:
```
node_modules/
dist/
build/
coverage/
coverage-*/
tmp/
*.min.js
.env*
eslint.config.js
src/migrations/
src/migrations/*.ts
src/migrations/**/*.ts
schema.graphql
specs/
*.md
**/*.md
package-lock.json
yarn.lock
pnpm-lock.yaml
```

**Biome Configuration**:
```json
{
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "coverage-*",
      "tmp",
      "*.min.js",
      ".env*",
      "src/migrations/**",
      "schema.graphql",
      "specs/**",
      "**/*.md",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml"
    ]
  }
}
```

**Rationale**: Biome uses glob patterns similar to gitignore. The migration tool can auto-convert most patterns.

---

### 5. VS Code Integration

**Decision**: Configure VS Code to use Biome as default formatter with format-on-save

**Recommended .vscode/settings.json**:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

**Recommended .vscode/extensions.json**:
```json
{
  "recommendations": ["biomejs.biome"]
}
```

**Rationale**: Biome's VS Code extension provides real-time linting, format-on-save, and code actions.

---

### 6. lint-staged Integration

**Decision**: Update lint-staged to use Biome commands

**Current Configuration (.lintstagedrc.json)**:
```json
{
  "src/**/*.ts{,x}": [
    "cross-env NODE_ENV=production eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": "prettier --write"
}
```

**New Configuration**:
```json
{
  "*.{js,jsx,ts,tsx,json}": [
    "biome check --write --no-errors-on-unmatched"
  ]
}
```

**Rationale**:
- `biome check` runs both formatting and linting in one pass
- `--write` applies safe fixes
- `--no-errors-on-unmatched` prevents errors for files not in Biome's scope
- Markdown files are excluded from Biome (no native support yet)

---

### 7. Package.json Scripts

**Decision**: Replace ESLint/Prettier scripts with Biome equivalents

| Current Script | New Script | Notes |
|----------------|------------|-------|
| `"lint": "tsc --noEmit && eslint src/**/*.ts"` | `"lint": "tsc --noEmit && biome check src/"` | Combined lint + format check |
| `"lint:prod": "..."` | `"lint:prod": "tsc --noEmit && biome ci src/"` | CI mode for stricter checking |
| `"lint:fix": "tsc --noEmit && eslint src/**/*.ts --fix"` | `"lint:fix": "tsc --noEmit && biome check --write src/"` | Apply safe fixes |
| `"format": "prettier --write \"src/**/*.ts\""` | `"format": "biome format --write src/"` | Format only |
| N/A | `"format:check": "biome format src/"` | Format validation without writing |

**Rationale**: Biome's unified approach means fewer separate commands.

---

### 8. Environment-Based Severity Handling

**Decision**: Use production-level severity for all environments, document change

**Current Behavior**:
```javascript
const env = (prod, dev) => (process.env.NODE_ENV === 'production' ? prod : dev);
// 'no-console': env(1, 0)  // error in prod, off in dev
// 'no-debugger': env(1, 0) // error in prod, off in dev
// '@typescript-eslint/no-unused-vars': env(2, 1) // error in prod, warn in dev
```

**Biome Behavior**: Static configuration only

**Migration Approach**:
- Set `noConsole: "error"` and `noDebuggerStatement: "error"`
- Developers can use `// biome-ignore` comments for local debugging
- Or configure VS Code to disable these rules in workspace settings for development

**Rationale**: Biome doesn't support environment-based configuration. Using production settings ensures CI catches issues that would fail in production.

---

### 9. CI Integration

**Decision**: Use `biome ci` for CI pipelines

**Recommended CI command**:
```bash
biome ci .
```

**Characteristics**:
- Exits with non-zero code on any error
- No file modifications (read-only)
- Optimized for CI environments

**Rationale**: `biome ci` is specifically designed for continuous integration with appropriate exit codes and no side effects.

---

### 10. Performance Expectations

**Decision**: Document expected performance improvements

**Biome Benchmarks** (from official benchmarks):
- Formatting: ~25x faster than Prettier
- Linting: ~15x faster than ESLint
- Combined: Significantly faster due to single-pass architecture

**Expected Results for Alkemio Server (~3000 files)**:
- Current full lint: Typically 30-60 seconds with ESLint + Prettier
- Expected Biome: Under 5 seconds (target: 5x improvement easily achievable)
- Incremental: Sub-second for single files

**Benchmark Methodology** (per spec):
- Run 5 iterations locally
- Report median time
- Compare old tools vs Biome

---

## Dependencies

| Package | Action | Notes |
|---------|--------|-------|
| `@biomejs/biome` | ADD | Core Biome package |
| `eslint` | REMOVE | Replaced by Biome |
| `@typescript-eslint/eslint-plugin` | REMOVE | Rules in Biome |
| `@typescript-eslint/parser` | REMOVE | Biome has native TS support |
| `eslint-config-prettier` | REMOVE | No longer needed |
| `eslint-plugin-prettier` | REMOVE | No longer needed |
| `eslint-plugin-import` | REMOVE | Basic import rules in Biome |
| `prettier` | REMOVE | Replaced by Biome |
| `@eslint/eslintrc` | REMOVE | ESLint compat layer |
| `@eslint/js` | REMOVE | ESLint core |
| `globals` | REMOVE | ESLint globals |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rule parity gaps | Low | Medium | Document unmapped rules; Biome covers 340+ rules |
| Large formatting diff | Medium | Low | Run auto-fix once; review in single PR |
| Team unfamiliarity | Low | Low | Biome syntax similar to ESLint; provide quickstart guide |
| CI integration issues | Low | Medium | Test locally with `biome ci` before merging |

---

## Open Questions (Resolved)

1. ✅ **Dynamic severity**: Biome uses static config. Use production settings.
2. ✅ **Type-checking integration**: `tsc --noEmit` remains separate (Biome doesn't type-check)
3. ✅ **Markdown formatting**: Biome has experimental Markdown support; exclude for now
4. ✅ **GraphQL linting**: Biome supports GraphQL linting; can be enabled if needed
