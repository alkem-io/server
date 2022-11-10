import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.type';

export const opportunityCommunityPolicy: ICommunityPolicyDefinition = {
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
  lead: {
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
