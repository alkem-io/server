import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { RoomMessageAttachmentInput } from './room.dto.attachment';

@InputType()
export class RoomSendMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room the message is being sent to',
  })
  roomID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  message!: string;

  @Field(() => RoomMessageAttachmentInput, {
    nullable: true,
    description: 'An already-uploaded Matrix media reference.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoomMessageAttachmentInput)
  attachmentUpload?: RoomMessageAttachmentInput;
}
