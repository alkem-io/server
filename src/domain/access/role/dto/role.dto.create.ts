import { CommunityRoleType } from '@common/enums/community.role';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IContributorRolePolicy } from '../contributor.role.policy.interface';

export class CreateRoleInput {
  type!: CommunityRoleType;
  requireBaseRole!: boolean;
  requireParentRole!: boolean;
  credentialData!: ICredentialDefinition;
  parentCredentialsData!: ICredentialDefinition[];
  userPolicyData!: IContributorRolePolicy;
  organizationPolicyData!: IContributorRolePolicy;
  virtualContributorPolicyData!: IContributorRolePolicy;
}