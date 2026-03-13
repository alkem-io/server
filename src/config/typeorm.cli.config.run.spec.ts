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
});
