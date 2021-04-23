import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationMessageResult {
  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;
}
