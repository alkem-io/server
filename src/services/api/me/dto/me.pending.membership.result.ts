import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpacePendingMembershipInfo } from './me.space.pending.membership.info';

@ObjectType()
export class CommunityPendingMembershipResult {
  @Field(() => UUID, {
    description: 'ID for the pending membership',
  })
  id!: string;

  @Field(() => SpacePendingMembershipInfo, {
    description:
      'The key information for the Space that the application/invitation is for',
  })
  spacePendingMembershipInfo!: SpacePendingMembershipInfo;
}
