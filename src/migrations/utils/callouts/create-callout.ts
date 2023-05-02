import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { CalloutType } from '../../types/callout.type';
import { createProfile } from '../create-profile';
import { createAuthPolicy } from '../create-authorization-policy';

type CalloutOptions = {
  collaborationId: string;
  type: CalloutType;
  nameID: string;
  state?: string;
  visibility?: string;
  group?: string;
};

export const createCallout = async (
  queryRunner: QueryRunner,
  options: CalloutOptions
) => {
  const { collaborationId, type, nameID, state, visibility, group } = options;
  const profileId = await createProfile(queryRunner, {
    displayName: 'Recommended by the Host',
    tagline: '',
  });
  const authId = await createAuthPolicy(queryRunner);

  const calloutId = await randomUUID();

  await queryRunner.query(`
    INSERT INTO callout(id, version, nameID, type, state, visibility, authorizationId, collaborationId, sortOrder, profileId, \`group\`) VALUES 
    ('${calloutId}', 1, '${nameID}', '${type}',
    ${state === undefined ? 'DEFAULT' : `'${state}'`},
    ${visibility === undefined ? 'DEFAULT' : `'${visibility}'`},
   '${authId}', '${collaborationId}', 10, '${profileId}',
   ${group === undefined ? 'KNOWLEDGE' : `'${group}'`}
 )`);

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
