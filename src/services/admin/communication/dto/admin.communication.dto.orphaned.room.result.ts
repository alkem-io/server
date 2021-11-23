import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunicationAdminRoomResult {
  @Field(() => String, {
    description: 'Display name of the result',
  })
  displayName: string;

  @Field(() => [String], {
    description: 'The members of the orphaned room',
  })
  members: string[];

  @Field(() => String, {
    description: 'The identifier for the orphaned room.',
  })
  id: string;

  constructor(id: string, displayName: string) {
    this.displayName = displayName;
    this.id = id;
    this.members = [];
  }
}
