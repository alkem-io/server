import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationAdminRoomResult } from './admin.communication.dto.orphaned.room.result';

@ObjectType()
export class CommunicationAdminOrphanedUsageResult {
  @Field(() => [CommunicationAdminRoomResult], {
    description: 'Rooms in the Communication platform that are not used',
  })
  rooms: CommunicationAdminRoomResult[];

  constructor() {
    this.rooms = [];
  }
}
