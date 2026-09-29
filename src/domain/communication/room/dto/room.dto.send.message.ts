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

  // Uploaded durable document; each send publishes one Matrix event.
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The file-service document ids of attachments to send with the message (one per event).',
  })
  @IsOptional()
  @ArrayMaxSize(1)
  // Reject a repeated document id — the same attachment must not be listed
  // twice (it would be validated/pinned/sent redundantly).
  @ArrayUnique()
  // Version-agnostic: file-service mints document ids as UUIDv7, while
  // server-generated ids are UUIDv4. Pinning 'v4' here rejected every real
  // attachment id. 'all' accepts any UUID version.
  @IsUUID('all', { each: true })
  attachments?: string[];
}
