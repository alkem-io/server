import { vi } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}));

describe('typeormCliConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export a valid DataSourceOptions object', async () => {
    const mod = await import('./typeorm.cli.config');
    const config = mod.typeormCliConfig;

    expect(config).toBeDefined();
    expect(config.type).toBe('postgres');
    expect(config.synchronize).toBe(false);
    expect(config.cache).toBe(true);
    expect(config.migrationsTableName).toBe('migrations_typeorm');
    expect(config.migrationsRun).toBe(true);
  });

  it('should use default database host when env var is not set', async () => {
    delete process.env.DATABASE_HOST;
    const mod = await import('./typeorm.cli.config');

    expect((mod.typeormCliConfig as any).host).toBe('localhost');
  });

  it('should use default database port when env var is not set', async () => {
    delete process.env.DATABASE_PORT;
    const mod = await import('./typeorm.cli.config');

    expect((mod.typeormCliConfig as any).port).toBe(5432);
  });

  it('should use env var for database host when set', async () => {
    const original = process.env.DATABASE_HOST;
    process.env.DATABASE_HOST = 'custom-host';

    const mod = await import('./typeorm.cli.config');
    expect((mod.typeormCliConfig as any).host).toBe('custom-host');

    if (original === undefined) {
      delete process.env.DATABASE_HOST;
    } else {
      process.env.DATABASE_HOST = original;
    }
  });

  it('should include entity paths in config', async () => {
    const mod = await import('./typeorm.cli.config');
    const config = mod.typeormCliConfig as any;

    expect(config.entities).toBeDefined();
    expect(config.entities.length).toBeGreaterThan(0);
  });
});
