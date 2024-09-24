import { AuthorizationCredential } from '@common/enums';
import { CommunityRoleType } from '@common/enums/community.role';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';

export const subspaceCommunityRoles: CreateRoleInput[] = [
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
      enabled: true,
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      enabled: true,
      minimum: 0,
      maximum: -1,
    },
    virtualContributorPolicyData: {
      enabled: true,
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
      enabled: true,
      minimum: 0,
      maximum: 2,
    },
    organizationPolicyData: {
      enabled: true,
      minimum: 0,
      maximum: 9,
    },
    virtualContributorPolicyData: {
      enabled: true,
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
      enabled: true,
      minimum: 0,
      maximum: -1,
    },
    organizationPolicyData: {
      enabled: true,
      minimum: 0,
      maximum: 0,
    },
    virtualContributorPolicyData: {
      enabled: true,
      minimum: 0,
      maximum: 0,
    },
  },
];
