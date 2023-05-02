import { randomUUID } from 'crypto';
import { createLocation } from './create-location';
import { createAuthPolicy } from './create-authorization-policy';
import { QueryRunner } from 'typeorm';
import { createTagset } from '@src/migrations/utils/create-tagset';

type ProfileOptions = {
  displayName?: string;
  tagline?: string;
};

export const createProfile = async (
  queryRunner: QueryRunner,
  options?: ProfileOptions
) => {
  const { displayName, tagline } = options ?? {};

  const locationId = await createLocation(queryRunner);
  const authId = await createAuthPolicy(queryRunner);

  const profileId = randomUUID();

  await queryRunner.query(`
    INSERT INTO profile (id, version, authorizationId, locationId, displayName, tagline) VALUES
    ('${profileId}', 1, '${authId}', '${locationId}',
    ${displayName === undefined ? 'DEFAULT' : `'${displayName}'`}, 
    ${tagline === undefined ? 'DEFAULT' : `'${tagline}'`}
    )`);

  await createTagset(queryRunner, { profileId });

  return profileId;
};
