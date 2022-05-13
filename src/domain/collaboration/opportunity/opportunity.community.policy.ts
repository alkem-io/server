import { AuthorizationCredential } from '@common/enums';
import { CommunityPolicy } from '@domain/community/community/community.policy';

export const opportunityCommunityPolicy: CommunityPolicy = {
  member: {
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_MEMBER,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  leader: {
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_LEAD,
      resourceID: '',
    },
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  },
};
