import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';

export const spaceCommunityPolicy: ICommunityPolicyDefinition = {
  member: {
    credential: {
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  lead: {
    credential: {
      type: AuthorizationCredential.SPACE_HOST,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: 1,
    minUser: 0,
    maxUser: 2,
  },
};
