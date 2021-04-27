import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationSendMessageInput {
  @Field(() => String, {
    nullable: true,
    description: 'The identifier of the room',
  })
  roomID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The content of the message',
  })
  message!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The email of the receiver if attempting to direct message someone',
  })
  receiverEmail!: string;
}
