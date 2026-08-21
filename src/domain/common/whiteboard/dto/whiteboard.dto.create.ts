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
  // bucket, delivered over the collaboration WS). The "Save as Template" / duplicate
  // flow therefore cannot seed a new whiteboard from a source's scene on the client;
  // instead it names the source here and the server reads that whiteboard's stored
  // Yjs-V2 snapshot (under a READ authorization on the source) and seeds the new
  // whiteboard's bucket with it, re-homing embedded media into the new bucket.
  //
  // `content` and `sourceWhiteboardID` are MUTUALLY EXCLUSIVE — supply exactly one.
  // The client sends `sourceWhiteboardID` ALONE for Save-as-Template (no empty
  // `content` placeholder alongside it): the server rejects a create that carries BOTH
  // (by presence, so `content: ''` also collides). An empty / unresolvable source seeds
  // an EMPTY, editable board — it does NOT fall back to `content`.
  @Field(() => UUID, {
    nullable: true,
    description:
      'Seed the new Whiteboard from the stored content of an existing Whiteboard (server-side copy). Mutually exclusive with `content` — supply exactly one.',
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
