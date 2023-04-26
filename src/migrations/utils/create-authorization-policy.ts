import { randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';

export const createAuthPolicy = async (queryRunner: QueryRunner) => {
  const authId = randomUUID();
  await queryRunner.query(
    `INSERT INTO authorization_policy VALUES ('${authId}', NOW(), NOW(), 1, '', '', 0, '')`
  );

  return authId;
};
