import { vi } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}));

describe('typeormCliConfig (run)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

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

    // The run config does not define entities (used only for migrations)
    expect(config.entities).toBeUndefined();
  });

  it('should use default port 5432 when env var is not set', async () => {
    delete process.env.DATABASE_PORT;
    const mod = await import('./typeorm.cli.config.run');

    expect((mod.typeormCliConfig as any).port).toBe(5432);
  });
});
