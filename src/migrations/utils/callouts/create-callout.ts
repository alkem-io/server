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
    INSERT INTO callout(id, createdDate, updatedDate, version, nameID, type, state, visibility, authorizationId, collaborationId, sortOrder, publishedDate, profileId, \`group\`) VALUES
    ('${calloutId}', NOW(), NOW(), 1, '${nameID}', '${type}', 'open', 'draft', '${authId}', '${collaborationID}', 10, NOW(), '${profileId}', 'knowledge')
  `);

  await updateCallout(collaborationID, type);

  return { authId, profileId, calloutId };
};

const updateCallout = (calloutId: string, type: CalloutType) => {
  switch (type) {
    case CalloutType.LINK_COLLECTION:
      return updateToLinkCallout(calloutId);
    default:
      throw new Error(`'${type}' handler not implemented!`);
  }
};
