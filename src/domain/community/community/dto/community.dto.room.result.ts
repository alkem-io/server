import { CommunicationMessageResult } from '@domain/common/communication/communication.dto.message.result';
import { CommunicationRoomResult } from '@domain/common/communication/communication.dto.room.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunityRoom')
export class CommunityRoomResult extends CommunicationRoomResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  id!: string;

  @Field(() => [CommunicationMessageResult], {
    nullable: false,
    description: 'The messages that have been sent to the Room.',
  })
  messages!: CommunicationMessageResult[];
}
