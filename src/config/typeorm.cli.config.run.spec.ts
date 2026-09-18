import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('typeormCliConfig (run)', () => {
  it('should export a valid DataSourceOptions object', async () => {
    const mod = await import('./typeorm.cli.config.run');
    const config = mod.typeormCliConfig;

    expect(config).toBeDefined();
    expect(config.type).toBe('postgres');
    expect(config.synchronize).toBe(false);
    expect(config.cache).toBe(true);
    expect(config.migrationsTableName).toBe('migrations_typeorm');
  });

  it('should not include entity paths in run config', async () => {
    const mod = await import('./typeorm.cli.config.run');
    const config = mod.typeormCliConfig as any;

    expect(config.entities).toBeUndefined();
  });

  it('should resolve the migrations glob relative to __dirname (not CWD) so it works under ts-node (src/) and compiled (dist/) execution', async () => {
    const mod = await import('./typeorm.cli.config.run');
    const config = mod.typeormCliConfig as any;

    expect(Array.isArray(config.migrations)).toBe(true);
    const [migrationsGlob] = config.migrations as string[];
    // __dirname here resolves to this test file's own directory (src/config,
    // whether run via ts-node or compiled to dist/config) — the glob must be
    // anchored one level up in `migrations`, not in the process CWD.
    expect(migrationsGlob).toBe(
      join(__dirname, '..', 'migrations', '*.{ts,js}')
    );
    // Anchored to this module's own directory (whatever it is — src/config
    // under ts-node, dist/config compiled), not a fixed 'src/migrations'
    // string relative to the process CWD.
    expect(migrationsGlob.endsWith(join('migrations', '*.{ts,js}'))).toBe(true);
  });

  it('mechanical guard: every migration file imports only typeorm, node builtins, or a relative module inside src/migrations (no path-aliased or third-party imports, which would break the plain-Node compiled CLI path)', () => {
    const migrationsDir = join(__dirname, '..', 'migrations');
    const migrationFiles = readdirSync(migrationsDir).filter(f =>
      f.endsWith('.ts')
    );
    expect(migrationFiles.length).toBeGreaterThan(0);

    const allowedImportPattern = /^(typeorm|node:|crypto$)/;
    const importLineRegex =
      /^import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"];?/gm;

    const offenders: string[] = [];
    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsDir, file), 'utf-8');
      for (const match of content.matchAll(importLineRegex)) {
        const specifier = match[1];
        if (allowedImportPattern.test(specifier)) {
          continue;
        }

        // A RELATIVE import is fine — `tsconfig.build.json` includes
        // `src/**/*` and the Dockerfile copies the whole of `dist/`, so
        // `./utils/x` compiles to `dist/migrations/utils/x.js` and resolves
        // under plain Node exactly as it does under ts-node. What breaks the
        // compiled CLI is a PATH ALIAS (`@common/...`) — tsconfig `paths` are
        // a compile-time fiction that Node never sees — or a third-party
        // package that the runtime image does not install.
        //
        // Narrowed from "reject everything but typeorm/node" during the
        // 027-platform-role-redesign merge. That original form would have
        // forced `platform.role.seed.definitions.ts` to be duplicated into
        // both the fresh-install seed migration and the upgrade migration,
        // and the FR-011 anti-drift spec
        // (`role.credential.map.spec.ts`) can only pin ONE copy against
        // `RoleName`/`AuthorizationCredential` — so the two would have been
        // free to diverge silently. Trading a tested invariant for a guard
        // whose stated hazard does not apply here is a bad trade.
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          // Still prove the target is real AND inside the compiled migrations
          // tree, so a typo or an escape into `src/` at large still fails.
          const resolved = join(migrationsDir, file, '..', specifier);
          const onDisk = ['.ts', '.js', '/index.ts'].some(ext =>
            existsSync(`${resolved}${ext}`)
          );
          if (!onDisk) {
            offenders.push(`${file}: ${specifier} (unresolvable)`);
          } else if (!resolved.startsWith(migrationsDir + '/')) {
            offenders.push(`${file}: ${specifier} (escapes src/migrations)`);
          }
          continue;
        }

        offenders.push(`${file}: ${specifier}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('mechanical guard: no migration reaches out of src/migrations via a path alias', () => {
    // The half of the rule above that must never be relaxed, pinned on its
    // own so a future edit to the relative-import allowance cannot quietly
    // take this with it.
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));

    const aliasImports: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(migrationsDir, file), 'utf-8');
      for (const match of content.matchAll(
        /^import\s+(?:type\s+)?[^'"]*from\s+['"](@[^'"]+)['"];?/gm
      )) {
        aliasImports.push(`${file}: ${match[1]}`);
      }
    }

    expect(aliasImports).toEqual([]);
  });
});
