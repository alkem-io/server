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
      'Display name renames flow through parent-entity mutations (e.g., updateCollaboraDocument), which carry the context — file extension, MIME, profile coupling — needed to keep editor titles, download names, and the file-service row in sync. The generic updateDocument deliberately does not expose rename and rejects this field with a ValidationException if provided.',
    deprecationReason:
      'Use the parent-entity update mutation (e.g., updateCollaboraDocument) for renames.',
  })
  @IsOptional()
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;
}
