import { ICommunityRolePolicy } from './community.policy.role.interface';

export abstract class ICommunityPolicyDefinition {
  member!: ICommunityRolePolicy;
  lead!: ICommunityRolePolicy;
  admin!: ICommunityRolePolicy;
  host!: ICommunityRolePolicy;
}
