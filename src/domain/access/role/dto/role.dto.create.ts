import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IContributorRolePolicy } from '../contributor.role.policy.interface';

export class CreateRoleInput {
  type!: RoleName;
  requiresEntryRole!: boolean;
  requiresSameRoleInParentRoleSet!: boolean;
  credentialData!: ICredentialDefinition;
  parentCredentialsData!: ICredentialDefinition[];
  userPolicyData!: IContributorRolePolicy;
  organizationPolicyData!: IContributorRolePolicy;
  virtualContributorPolicyData!: IContributorRolePolicy;
}
