import { randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';

export const createAuthPolicy = async (queryRunner: QueryRunner) => {
  const authId = randomUUID();
  await queryRunner.query(`
    INSERT INTO authorization_policy VALUES
    ('${authId}', DEFAULT, DEFAULT, 1, '', '', 0, '')
   `);

  return authId;
};
