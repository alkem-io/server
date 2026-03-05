import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IActorRolePolicy } from '../actor.role.policy.interface';

export class CreateRoleInput {
  name!: RoleName;
  requiresEntryRole!: boolean;
  requiresSameRoleInParentRoleSet!: boolean;
  credentialData!: ICredentialDefinition;
  parentCredentialsData!: ICredentialDefinition[];
  userPolicyData!: IActorRolePolicy;
  organizationPolicyData!: IActorRolePolicy;
  virtualContributorPolicyData!: IActorRolePolicy;
}
