// Minimal TypeORM DataSource stand-in; enough for modules that inject DataSource but won't actually run queries.
export const DataSourceStubProvider = {
  provide: 'DataSource',
  useValue: {
    manager: {},
    getRepository: () => ({ find: async () => [], findOne: async () => null }),
    // add more methods if tests require
  },
};
