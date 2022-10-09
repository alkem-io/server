import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunicationAdminRoomMembershipResult {
  @Field(() => [String], {
    description: 'Name of the room',
  })
  members: string[];

  @Field(() => [String], {
    description: 'Members of the community that are missing from the room',
  })
  missingMembers: string[];

  @Field(() => [String], {
    description: 'Members of the room that are not members of the Community.',
  })
  extraMembers: string[];

  @Field(() => String, {
    description: 'Display name of the entity',
  })
  displayName: string;

  @Field(() => String, {
    description: 'The matrix room ID',
  })
  roomID: string;

  @Field(() => String, {
    description: 'The access mode for the room.',
  })
  joinRule: string;

  @Field(() => String, {
    description: 'A unique identifier for this membership result.',
  })
  id: string;

  constructor(id: string, displayName: string) {
    this.displayName = displayName;
    this.id = id;
    this.members = [];
    this.missingMembers = [];
    this.extraMembers = [];
    this.roomID = '';
    this.joinRule = '';
  }
}
