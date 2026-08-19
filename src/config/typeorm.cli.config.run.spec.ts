import { readdirSync, readFileSync } from 'fs';
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

  it('mechanical guard: every migration file imports only typeorm and node builtins (no path-aliased imports, which would break the plain-Node compiled CLI path)', () => {
    const migrationsDir = join(__dirname, '..', 'migrations');
    const migrationFiles = readdirSync(migrationsDir).filter(f =>
      f.endsWith('.ts')
    );
    expect(migrationFiles.length).toBeGreaterThan(0);

    const allowedImportPattern = /^(typeorm|node:|crypto$)/;
    const importLineRegex = /^import\s+[^'"]*from\s+['"]([^'"]+)['"];?/gm;

    const offenders: string[] = [];
    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsDir, file), 'utf-8');
      for (const match of content.matchAll(importLineRegex)) {
        const specifier = match[1];
        if (!allowedImportPattern.test(specifier)) {
          offenders.push(`${file}: ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
