import { Field, ObjectType } from '@nestjs/graphql';
import { CommunicationMessageResult } from './communication.dto.message.result';

@ObjectType('CommunicationMessageReceived')
export class CommunicationMessageReceived {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier of the room',
  })
  roomId!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The public name of the room',
  })
  roomName!: string;

  @Field(() => CommunicationMessageResult, {
    nullable: false,
    description: 'The update message that has been sent.',
  })
  message!: CommunicationMessageResult;

  @Field(() => String, {
    nullable: false,
    description: 'The user email that should receive the message',
  })
  userID!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The community to which this message corresponds',
  })
  communityId!: string | undefined;
}
