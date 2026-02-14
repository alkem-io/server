/**
 * Minimal DataSource / EntityManager stand-ins using string tokens.
 * Kept only for schema-bootstrap module compatibility — nothing in the
 * application injects DataSource or EntityManager any longer (Drizzle is used instead).
 */

const queryBuilderStub = {
  leftJoinAndSelect() {
    return this;
  },
  innerJoinAndSelect() {
    return this;
  },
  where() {
    return this;
  },
  andWhere() {
    return this;
  },
  orWhere() {
    return this;
  },
  orderBy() {
    return this;
  },
  skip() {
    return this;
  },
  take() {
    return this;
  },
  withDeleted() {
    return this;
  },
  getMany: async () => [],
  getManyAndCount: async () => [[], 0],
  getOne: async () => null,
  getRawMany: async () => [],
  getRawOne: async () => null,
  getCount: async () => 0,
};

const repositoryStub = {
  find: async () => [],
  findOne: async () => null,
  findOneBy: async () => null,
  findBy: async () => [],
  save: async <T>(entity: T) => entity,
  create: <T>(entity: T) => entity,
  createQueryBuilder: () => queryBuilderStub,
};

const entityManagerStub = {
  find: async () => [],
  findOne: async () => null,
  findOneBy: async () => null,
  findBy: async () => [],
  save: async <T>(entity: T) => entity,
  create: <T>(entity: T) => entity,
  createQueryBuilder: () => queryBuilderStub,
  getRepository: () => repositoryStub,
};

const dataSourceStub = {
  manager: entityManagerStub,
  getRepository: () => repositoryStub,
  getTreeRepository: () => repositoryStub,
  getMongoRepository: () => repositoryStub,
  createQueryRunner: () => ({
    manager: entityManagerStub,
    connect: async () => undefined,
    release: async () => undefined,
  }),
  entityMetadatas: [],
  options: { type: 'postgres' },
};

export const DataSourceStubProvider = {
  provide: 'DataSource',
  useValue: dataSourceStub,
};

export const DefaultDataSourceStubProvider = {
  provide: 'defaultDataSource',
  useValue: dataSourceStub,
};

export const EntityManagerStubProvider = {
  provide: 'EntityManager',
  useValue: entityManagerStub,
};

export const DefaultEntityManagerStubProvider = {
  provide: 'defaultEntityManager',
  useValue: entityManagerStub,
};
