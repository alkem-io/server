import { randomUUID } from 'crypto';
import { CalloutType } from '../../types/callout.type';
import { createProfile } from '../create-profile';
import { createAuthPolicy } from '../create-authorization-policy';
import { updateToLinkCallout } from './update-to-link-callout';
import { QueryRunner } from 'typeorm';

export const createCallout = async (
  queryRunner: QueryRunner,
  collaborationID: string,
  type: CalloutType,
  nameID: string
) => {
  const profileId = await createProfile(queryRunner);
  const authId = await createAuthPolicy(queryRunner);

  const calloutId = await randomUUID();

  await queryRunner.query(`
    INSERT INTO callout(id, version, nameID, type, authorizationId, collaborationId, sortOrder, profileId) VALUES
    ('${calloutId}', 1, '${nameID}', '${type}', '${authId}', '${collaborationID}', 10, '${profileId}')
  `);

  await updateCallout(queryRunner, calloutId, type);

  return { authId, profileId, calloutId };
};

const updateCallout = (
  queryRunner: QueryRunner,
  calloutId: string,
  type: CalloutType
) => {
  switch (type) {
    case CalloutType.LINK_COLLECTION:
      return updateToLinkCallout(queryRunner, calloutId);
    default:
      throw new Error(`'${type}' handler not implemented!`);
  }
};
