import { LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
@InputType()
export class DiscussionSendMessageInput extends RoomSendMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Discussion the message is being sent to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  message!: string;
}
