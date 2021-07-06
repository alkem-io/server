import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ApplicationResultEntry {
  @Field(() => UUID, {
    description: 'ID for the application',
  })
  id: string;

  @Field(() => UUID, {
    description: 'ID for the community',
  })
  communityID: string;

  @Field(() => String, {
    description: 'Display name of the community',
  })
  displayName: string;

  @Field(() => String, {
    description: 'The current state of the application.',
  })
  state: string;

  constructor(
    communityID: string,
    displayName: string,
    state: string,
    id: string
  ) {
    this.displayName = displayName;
    this.communityID = communityID;
    this.state = state;
    this.id = id;
  }
}
