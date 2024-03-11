import { AuthorizationCredential } from '@common/enums';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';

export const opportunityCommunityPolicy: ICommunityPolicyDefinition = {
  member: {
    enabled: true,
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_MEMBER,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: -1,
    minUser: 0,
    maxUser: -1,
  },
  lead: {
    enabled: true,
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_LEAD,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  },
  admin: {
    enabled: true,
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_ADMIN,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: 0,
    minUser: 0,
    maxUser: -1,
  },
  host: {
    enabled: false,
    credential: {
      type: AuthorizationCredential.OPPORTUNITY_HOST,
      resourceID: '',
    },
    parentCredentials: [],
    minOrg: 0,
    maxOrg: 0,
    minUser: 0,
    maxUser: 0,
  },
};
