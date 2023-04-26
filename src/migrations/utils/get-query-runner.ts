import datasource from '@config/migration.config';

export const getQueryRunner = async () => {
  const queryRunner = datasource.createQueryRunner();
  await queryRunner.connect();

  return queryRunner;
};
