import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';

export const hubCommunityPolicy: ICommunityPolicy = {
  member: {
    credential: {
      type: AuthorizationCredential.HUB_MEMBER,
      resourceID: '',
    },
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
    minOrg: 0,
    maxOrg: 1,
    minUser: 0,
    maxUser: 2,
  },
};
