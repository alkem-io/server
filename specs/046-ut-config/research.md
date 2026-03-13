# Research: src/config Code Analysis

**Created**: 2026-03-12

## File Inventory (16 files)

| File | Type | Testable | Reason |
|------|------|----------|--------|
| `config.utils.ts` | Utility class | Yes | Pure function `parseHMSString` with parsing logic |
| `configuration.ts` | Config loader | Yes | YAML parsing, env var substitution, type coercion |
| `fix.uuid.column.type.ts` | TypeORM patch | Yes | Column type normalization with branching logic |
| `winston.config.ts` | NestJS service | Yes | Transport creation based on config values |
| `aliases.ts` | Module alias setup | No | Side effects at import; path resolution depends on fs |
| `dynamic.import.ts` | ESM import wrapper | No | Single-line `new Function` wrapper, not unit-testable |
| `index.ts` | Barrel export | No | Convention excludes |
| `graphql/index.ts` | Barrel export | No | Convention excludes |
| `graphql/config.ts` | GQL query constant | No | Declarative, no logic |
| `graphql/me.ts` | GQL query constant | No | Declarative, no logic |
| `graphql/metadata.ts` | GQL query constant | No | Declarative, no logic |
| `graphql/spaces.ts` | GQL query constant | No | Declarative, no logic |
| `migration.config.ts` | DataSource init | No | Side effects (DataSource init + fixUUID) at import |
| `migration.create.config.ts` | DataSource init | No | Side effects (DataSource init) at import |
| `typeorm.cli.config.ts` | Config object | No | Declarative config with env vars at module scope |
| `typeorm.cli.config.run.ts` | Config object | No | Declarative config with env vars at module scope |

## Key Findings

### config.utils.ts
- Static class with `parseHMSString(hms: string): number | undefined`
- Parses `1d12h34m56s` format strings into total seconds
- Returns `undefined` for non-matching input
- Uses regex `(\d+)(\D+)` with exec loop

### configuration.ts
- Default export is a factory function returning parsed config
- `resolveConfigFilePath()`: checks env var path, cwd path, dirname path
- `buildYamlNodeValue()`: substitutes `${ENV_VAR}:default` patterns
- Type coercion: `"true"` -> `true`, `"false"` -> `false`, numeric strings -> numbers

### fix.uuid.column.type.ts
- Patches TypeORM Driver's `normalizeType` to handle UUID columns
- `uuid` type returns `'uuid'`
- `char` with length 36 returns `'uuid'` and deletes length
- Other types delegate to original `normalizeType`

### winston.config.ts
- `WinstonConfigService` injectable with `ConfigService` dependency
- `createWinstonModuleOptions()` builds transports array
- Console transport always created; file transport conditional on `context_to_file.enabled`
- Format selection: JSON format for prod, nestLike for standard
