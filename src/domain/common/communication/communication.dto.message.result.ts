import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommunicationMessageResult {
  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The sender user ID',
  })
  sender!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => String, {
    nullable: false,
    description: 'The id for the message event.',
  })
  id!: string;

  receiverID!: string;
}
