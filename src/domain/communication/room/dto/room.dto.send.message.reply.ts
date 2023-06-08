import { Field, InputType } from '@nestjs/graphql';
import { RoomSendMessageInput } from './room.dto.send.message';
import { MessageID } from '@domain/common/scalars';

@InputType()
export class RoomSendMessageReplyInput extends RoomSendMessageInput {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The message starting the thread being replied to',
  })
  threadID!: string;
}
