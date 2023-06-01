import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddMessageReactionInput {
  @Field(() => String, {
    nullable: false,
    description: 'The Discussion the message is being reacted to',
  })
  communicationRoomID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The reaction being sent',
  })
  // todo: emoji validation
  text!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being reacted to',
  })
  messageID!: string;
}
