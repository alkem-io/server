import { UUID } from '@domain/common/scalars';
import { RoomRemoveMessageInput } from '@domain/communication/room/dto/room.dto.remove.message';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommentsRemoveMessageInput extends RoomRemoveMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Comments the message is being removed from.',
  })
  commentsID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageID!: string;
}
