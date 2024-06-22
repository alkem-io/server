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
    nullable: false,
    description: 'The display name for the Document.',
  })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;
}
