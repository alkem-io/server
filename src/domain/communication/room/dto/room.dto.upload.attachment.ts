import { MessageID, UUID } from '@domain/common/scalars';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType('RoomMessageAttachmentUploadInput')
export class RoomMessageAttachmentUploadInput {
  @Field(() => UUID, { description: 'The room receiving the attachment.' })
  @IsUUID('all')
  roomID!: string;

  @Field(() => MessageID, {
    nullable: true,
    description: 'The existing reply parent, when uploading for a reply.',
  })
  @IsOptional()
  @MaxLength(512)
  threadID?: string;
}

@InputType('RoomMessageAttachmentInput')
export class RoomMessageAttachmentInput {
  @Field(() => String, {
    description: 'The completed local Matrix media reference.',
  })
  @IsString()
  @MaxLength(256)
  @Matches(/^[A-Za-z0-9_-]+$/)
  externalReference!: string;

  @Field(() => String, { description: 'The filename to use in this message.' })
  @MaxLength(512)
  displayName!: string;
}

@ObjectType('RoomMessageAttachmentUploadResult')
export class RoomMessageAttachmentUploadResult {
  @Field(() => String, { description: 'The uploaded Matrix media reference.' })
  externalReference!: string;
  @Field(() => String, { description: 'The sanitized filename.' })
  displayName!: string;
}
