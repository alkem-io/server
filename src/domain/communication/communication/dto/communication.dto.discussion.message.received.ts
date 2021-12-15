import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CommunicationDiscussionMessageReceived')
export class CommunicationDiscussionMessageReceived {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Discussion on which the message was sent.',
  })
  discussionID!: string;

  @Field(() => CommunicationMessageResult, {
    nullable: false,
    description: 'The message that has been sent.',
  })
  message!: CommunicationMessageResult;

  @Field(() => String, {
    nullable: false,
    description: 'The User that should receive the message',
  })
  userID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The community to which this message corresponds',
  })
  communityId!: string;
}
