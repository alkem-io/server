import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export const addPreferenceSet = async (
  queryRunner: QueryRunner
): Promise<string> => {
  const prefSetAuthId = randomUUID();
  await queryRunner.query(`
    INSERT INTO authorization_policy (id, createdDate, updatedDate, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
    VALUES ('${prefSetAuthId}', NOW(), NOW(), 1, '', '', 0, '')
  `);
  const prefSetId = randomUUID();
  await queryRunner.query(
    `INSERT INTO preference_set VALUES ('${prefSetId}', NOW(), NOW(), 1, '${prefSetAuthId}')`
  );
  return prefSetId;
};
