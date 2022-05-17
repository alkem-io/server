import { AuthorizationCredential } from '@common/enums';
import { CommunityPolicy } from '@domain/community/community/community.policy';

export const hubCommunityPolicy: CommunityPolicy = {
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
