describe('typeormCliConfig', () => {
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

  it('should include entity paths in config', async () => {
    const mod = await import('./typeorm.cli.config');
    const config = mod.typeormCliConfig as any;

    expect(config.entities).toBeDefined();
    expect(config.entities.length).toBeGreaterThan(0);
  });
});
