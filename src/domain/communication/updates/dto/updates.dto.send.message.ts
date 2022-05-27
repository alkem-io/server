import { MID_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdatesSendMessageInput extends RoomSendMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Updates the message is being sent to',
  })
  updatesID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
