import { CreateProfileInput } from '@domain/common/profile/dto';
import { NameID, UUID } from '@domain/common/scalars';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateWhiteboardPreviewSettingsInput } from './whiteboard.preview.settings.dto.create';

@InputType()
@ObjectType('CreateWhiteboardData')
export class CreateWhiteboardInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;

  // 006-collab-content-unification (#29): a live whiteboard's content is no
  // longer readable on the client (it moved out of GraphQL into the file-service
  // bucket, delivered over the collaboration WS). The "Save as Template" flow can
  // therefore no longer seed a new whiteboard from a source whiteboard's scene on
  // the client. When this points at an existing whiteboard, the server reads that
  // whiteboard's stored Yjs-V2 snapshot and seeds the new whiteboard's bucket with
  // it (the embedded media is re-homed into the new bucket like any create
  // content). It takes precedence over `content`, which the client now sends as an
  // empty placeholder. An unresolvable / empty source falls back to `content`.
  @Field(() => UUID, {
    nullable: true,
    description:
      'Seed the new Whiteboard from the stored content of an existing Whiteboard (server-side copy). Takes precedence over `content` when set and resolvable.',
  })
  @IsOptional()
  sourceWhiteboardID?: string;

  @Field(() => CreateWhiteboardPreviewSettingsInput, {
    nullable: true,
    description: 'The preview settings for the whiteboard.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWhiteboardPreviewSettingsInput)
  previewSettings?: CreateWhiteboardPreviewSettingsInput;
}
