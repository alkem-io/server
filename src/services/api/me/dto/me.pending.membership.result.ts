import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType()
export class CommunityPendingMembershipResult {
  @Field(() => UUID, {
    description: 'ID for the pending membership',
  })
  id!: string;

  @Field(() => ISpace, {
    description: 'The space that the application is for',
  })
  space!: ISpace;

  @Field(() => String, {
    description: 'The current state of the invitation.',
  })
  state!: string;

  @Field(() => Date, {
    description: 'Date of creation',
  })
  createdDate!: Date;
}
