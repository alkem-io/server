import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationRoom')
export class CommunicationRoomResult {
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

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the room',
  })
  displayName!: string;

  // The communication IDs of the room members
  members!: string[];

  constructor() {
    this.displayName = '';
  }
}
