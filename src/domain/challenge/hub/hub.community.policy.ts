import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';

export const hubCommunityPolicy: ICommunityPolicyDefinition = {
  member: {
    credential: {
      type: AuthorizationCredential.HUB_MEMBER,
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
      type: AuthorizationCredential.HUB_HOST,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: 1,
    minUser: 0,
    maxUser: 2,
  },
};
