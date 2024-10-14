import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceInfo } from './me.space.info';

@ObjectType()
export class CommunityPendingMembershipResult {
  @Field(() => UUID, {
    description: 'ID for the pending membership',
  })
  id!: string;

  @Field(() => SpaceInfo, {
    description:
      'The key information for the Space that the application/invitation is for',
  })
  spaceInfo!: SpaceInfo;
}
