import { LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
@InputType()
export class SendMessageReplyInput extends RoomSendMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The Room the message is being sent to',
  })
  communicationRoomID!: string;

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
