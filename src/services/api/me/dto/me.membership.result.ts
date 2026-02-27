import { UUID } from '@domain/common/scalars';
import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunityMembershipResult {
  @Field(() => UUID, {
    description: 'ID for the membership',
  })
  id!: string;

  @Field(() => ISpace, {
    description: 'The space for the membership is for',
  })
  space!: ISpace;

  @Field(() => [CommunityMembershipResult], {
    description: 'The child community memberships',
  })
  childMemberships!: CommunityMembershipResult[];
}
