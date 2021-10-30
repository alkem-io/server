import { UUID } from '@domain/common/scalars';
import { RoomRemoveMessageInput } from '@domain/communication/room/dto/room.dto.remove.message';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdatesRemoveMessageInput extends RoomRemoveMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Updates the message is being removed from.',
  })
  updatesID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageID!: string;
}
