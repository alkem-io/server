import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MAX_MESSAGE_ATTACHMENTS } from '../../conversation/conversation.media.constants';

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

  // Conversation media attachments (feature 013). file-service document ids,
  // already uploaded into the conversation bucket (temporaryLocation until send).
  // Bounded at the GraphQL layer (<=10, FR-023); READ + type/size are enforced
  // server-side in the send path against the conversation bucket policy.
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The file-service document ids of attachments to send with the message (max 10).',
  })
  @IsOptional()
  @ArrayMaxSize(MAX_MESSAGE_ATTACHMENTS)
  // Reject a repeated document id — the same attachment must not be listed
  // twice (it would be validated/pinned/sent redundantly).
  @ArrayUnique()
  @IsUUID('4', { each: true })
  attachments?: string[];
}
