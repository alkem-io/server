import { AuthorizationCredential } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';

export const spaceCommunityRoles: CreateRoleInput[] = [
  {
    name: RoleName.MEMBER,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false, // not required at Space level
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
    name: RoleName.LEAD,
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
    name: RoleName.ADMIN,
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
