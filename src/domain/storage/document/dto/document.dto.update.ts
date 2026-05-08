import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

@InputType()
export class UpdateDocumentInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateTagsetInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTagsetInput)
  tagset?: UpdateTagsetInput;

  @Field({
    nullable: true,
    description:
      "Display name. Currently rejected with a ValidationException — for documents owned by a parent entity (e.g., CollaboraDocument, Profile), use the parent's update mutation, which carries the context (file extension, MIME, profile coupling) needed to keep editor titles, download names, and the file-service row in sync. Direct rename via updateDocument will be wired when documents become a directly-managed resource (e.g., a per-space documents collection).",
  })
  @IsOptional()
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;
}
