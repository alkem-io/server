import { AuthorizationCredential } from '@common/enums';
import { CommunityRoleType } from '@common/enums/community.role';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';

export const spaceCommunityRoles: CreateRoleInput[] = [
  {
    type: CommunityRoleType.MEMBER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: true,
    credentialData: {
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: -1,
    },
  },
  {
    type: CommunityRoleType.LEAD,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.SPACE_LEAD,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: 2,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 2,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 1,
    },
  },
  {
    type: CommunityRoleType.ADMIN,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      minimum: 0,
      maximum: 0,
    },
  },
];
