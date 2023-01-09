import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class SendMessageOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Callout the message is being sent to',
  })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message contents',
  })
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
