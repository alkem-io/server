import { RoleType } from '@common/enums/role.type';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IContributorRolePolicy } from '../contributor.role.policy.interface';

export class CreateRoleInput {
  type!: RoleType;
  requiresEntryRole!: boolean;
  requiresSameRoleInParentRoleSet!: boolean;
  credentialData!: ICredentialDefinition;
  parentCredentialsData!: ICredentialDefinition[];
  userPolicyData!: IContributorRolePolicy;
  organizationPolicyData!: IContributorRolePolicy;
  virtualContributorPolicyData!: IContributorRolePolicy;
}
