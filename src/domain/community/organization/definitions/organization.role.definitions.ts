import { AuthorizationCredential } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';

export const organizationRoleDefinitions: CreateRoleInput[] = [
  {
    name: RoleName.ASSOCIATE,
    requiresEntryRole: false,
    requiresSameRoleInParentRoleSet: false, // not required
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
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
  {
    name: RoleName.ADMIN,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 0,
      maximum: 3,
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
  {
    name: RoleName.OWNER,
    requiresEntryRole: true,
    requiresSameRoleInParentRoleSet: false,
    credentialData: {
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: '',
    },
    parentCredentialsData: [],
    userPolicyData: {
      minimum: 1,
      maximum: 3,
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
