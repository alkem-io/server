import { MESSAGEID_LENGTH, UUID_LENGTH } from '@common/constants';
import { MessageID, UUID } from '@domain/common/scalars';
import { RoomRemoveMessageInput } from '@domain/communication/room/dto/room.dto.remove.message';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CommentsRemoveMessageInput extends RoomRemoveMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Comments the message is being removed from.',
  })
  @MaxLength(UUID_LENGTH)
  commentsID!: string;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  @MaxLength(MESSAGEID_LENGTH)
  messageID!: string;
}
