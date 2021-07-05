import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationMessageResult } from './communication.dto.message.result';

@ObjectType('Room')
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

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the Room is for direct messages to another user.',
  })
  isDirect!: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'The recepient userID',
  })
  receiverID?: string;
}
