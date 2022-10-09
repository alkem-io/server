import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationAdminRoomMembershipResult } from './admin.communication.dto.room.result';

@ObjectType()
export class CommunicationAdminMembershipResult {
  @Field(() => [CommunicationAdminRoomMembershipResult], {
    description: 'Rooms in this Communication',
  })
  rooms: CommunicationAdminRoomMembershipResult[];

  @Field(() => String, {
    description: 'Display name of the result',
  })
  displayName: string;

  @Field(() => String, {
    description:
      'A unique identifier for this comunication room membership result.',
  })
  id: string;

  constructor(id: string, displayName: string) {
    this.displayName = displayName;
    this.id = id;
    this.rooms = [];
  }
}
