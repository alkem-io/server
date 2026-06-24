import { LONG_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, MaxLength } from 'class-validator';

@InputType()
export class SendDirectMessageToUsersInput {
  @Field(() => [UUID], {
    nullable: false,
    description:
      'The Users (1..N) the message is sent to, each as an individual 1:1 chat. No group conversation is created.',
  })
  @ArrayNotEmpty()
  receiverIDs!: string[];

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent to each recipient.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  message!: string;
}
