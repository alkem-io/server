import { randomUUID } from 'crypto';
import { createLocation } from './create-location';
import { createAuthPolicy } from './create-authorization-policy';
import { QueryRunner } from 'typeorm';

export const createProfile = async (queryRunner: QueryRunner) => {
  const locationId = await createLocation(queryRunner);
  const authId = await createAuthPolicy(queryRunner);

  const profileId = randomUUID();

  await queryRunner.query(`
    INSERT INTO profile (id, version, authorizationId, locationId) VALUES
    ('${profileId}', 1, '${authId}', '${locationId}')
  `);

  return profileId;
};
