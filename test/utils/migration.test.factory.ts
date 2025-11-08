import { DataSource, DataSourceOptions } from 'typeorm';

export interface MigrationTestContext {
  dataSource: DataSource;
  close(): Promise<void>;
}

type SqliteTestOptions = DataSourceOptions & {
  type: 'sqlite';
  database: string;
};

const DEFAULT_OPTIONS: SqliteTestOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: false,
  logging: false,
};

export const createMigrationTestContext = async (
  overrides: Partial<SqliteTestOptions> = {}
): Promise<MigrationTestContext> => {
  const dataSource = new DataSource({
    ...DEFAULT_OPTIONS,
    ...overrides,
  } as DataSourceOptions);

  await dataSource.initialize();

  return {
    dataSource,
    async close() {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    },
  };
};
