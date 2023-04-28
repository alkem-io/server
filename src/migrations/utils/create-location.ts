import { randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';

export const createLocation = async (queryRunner: QueryRunner) => {
  const id = randomUUID();

  await queryRunner.query(`
    INSERT INTO location VALUES
    ('${id}', DEFAULT, DEFAULT, 1, '', '', DEFAULT ,DEFAULT, DEFAULT, DEFAULT)
  `);

  return id;
};
