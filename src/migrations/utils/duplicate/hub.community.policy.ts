import { AuthorizationCredential } from './authorization.credential';

export const hubCommunityPolicy: any = {
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
