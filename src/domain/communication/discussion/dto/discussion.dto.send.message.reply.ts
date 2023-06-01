import { LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
@InputType()
export class DiscussionSendMessageReplyInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Discussion the message is being replied to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  message!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being replied to',
  })
  threadID!: string;
}
