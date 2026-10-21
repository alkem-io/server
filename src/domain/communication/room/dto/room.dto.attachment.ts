import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches, MaxLength } from 'class-validator';

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
