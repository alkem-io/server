import { MID_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
@InputType()
export class DiscussionSendMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Discussion the message is being sent to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
