import { ICommunityPolicy } from './community.policy.interface';
import { CommunityPolicyRole } from './community.policy.role';

export class CommunityPolicy implements ICommunityPolicy {
  member!: CommunityPolicyRole;
  lead!: CommunityPolicyRole;
}
