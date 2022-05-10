import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MembershipResultCommunity {
  @Field(() => String, {
    description: 'Display name of the community',
  })
  displayName: string;

  @Field(() => UUID, {
    description: 'The ID of the community the user is a member of.',
  })
  id: string;

  constructor(id: string, displayName: string) {
    this.id = id;
    this.displayName = displayName;
  }
}
