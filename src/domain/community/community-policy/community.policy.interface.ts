import { Field, ObjectType } from '@nestjs/graphql';
import { ICommunityPolicyRole } from './community.policy.role.interface';

@ObjectType('CommunityPolicy')
export abstract class ICommunityPolicy {
  @Field(() => ICommunityPolicyRole)
  member!: ICommunityPolicyRole;

  @Field(() => ICommunityPolicyRole)
  lead!: ICommunityPolicyRole;
}
