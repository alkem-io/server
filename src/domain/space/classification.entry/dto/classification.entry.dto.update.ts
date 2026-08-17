import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { CreateClassificationValueInput } from '@domain/common/classification-value/dto/classification.value.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Definition edit — API-only this iteration (operator ruling D4). Every
// field is optional except the key: omitting `values` leaves the value set
// untouched, supplying it replaces it wholesale (subject to I-1/I-2/I-7).
@InputType()
export class UpdateClassificationEntryInput {
  @Field(() => UUID, { nullable: false })
  classificationEntryID!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  displayLabel?: string;

  @Field(() => ClassificationCardinality, { nullable: true })
  @IsOptional()
  cardinality?: ClassificationCardinality;

  @Field(() => [CreateClassificationValueInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateClassificationValueInput)
  @ArrayMinSize(1)
  values?: CreateClassificationValueInput[];
}
