import { randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';

export const createLocation = async (queryRunner: QueryRunner) => {
  const id = randomUUID();

  await queryRunner.query(`
    INSERT INTO location VALUES
    ('${id}', NOW(), NOW(), 1, '', '', '' ,'' ,'' ,'')
  `);

  return id;
};
