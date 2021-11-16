import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunicationAdminRoomMembershipResult {
  @Field(() => [String], {
    description: 'Name of the room',
  })
  members: string[];

  @Field(() => String, {
    description: 'Display name of the entity',
  })
  displayName: string;

  @Field(() => String, {
    description: 'A unique identifier for this membership result.',
  })
  id: string;

  constructor(id: string, displayName: string) {
    this.displayName = displayName;
    this.id = id;
    this.members = [];
  }
}
