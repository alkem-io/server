import { CreateProfileInput } from '@domain/common/profile/dto';
import { NameID, UUID } from '@domain/common/scalars';
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

  /** Server-internal canonical snapshot used by trusted copy/materialization paths. */
  content?: string;

  // 006-collab-content-unification (#29): a live whiteboard's content is no
  // longer readable on the client (it moved out of GraphQL into the file-service
  // bucket, delivered over the collaboration WS). The "Save as Template" / duplicate
  // flow therefore cannot seed a new whiteboard from a source's scene on the client;
  // instead it names the source here and the server reads that whiteboard's stored
  // Yjs-V2 snapshot (under a READ authorization on the source) and seeds the new
  // whiteboard's bucket with it, re-homing embedded media into the new bucket.
  //
  // The client sends `sourceWhiteboardID` ALONE for Save-as-Template. Omission creates
  // a canonical empty board. The internal `content` property exists only for trusted
  // server-owned serialization/materialization paths and is never a GraphQL field.
  @Field(() => UUID, {
    nullable: true,
    description:
      'Seed the new Whiteboard from the stored content of an existing Whiteboard through a server-side authorized copy. Omission creates an empty Whiteboard.',
  })
  @IsOptional()
  sourceWhiteboardID?: string;

  /**
   * Server-internal ownership boundary for canonical content copied from a
   * persisted Callout default. It is deliberately not a GraphQL field.
   */
  sourceStorageBucketID?: string;

  @Field(() => CreateWhiteboardPreviewSettingsInput, {
    nullable: true,
    description: 'The preview settings for the whiteboard.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWhiteboardPreviewSettingsInput)
  previewSettings?: CreateWhiteboardPreviewSettingsInput;
}
