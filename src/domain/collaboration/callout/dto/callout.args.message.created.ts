import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class SendMessageOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Callout the message is being sent to',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message contents',
  })
  message!: string;
}
