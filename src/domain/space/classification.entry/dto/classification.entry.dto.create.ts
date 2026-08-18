import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { CLASSIFICATION_VALUE_SET_MAX_SIZE } from '@domain/common/classification-value/classification.value.interface';
import { CreateClassificationValueInput } from '@domain/common/classification-value/dto/classification.value.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Ad-hoc (template-free) create. API-only this iteration (operator ruling
// D4). Keyed on spaceID (re-keyed from the pre-D1 classificationID — there
// is no container). `selectedValueIDs` is optional so a caller may do Step A
// and Step B in one call (FR-017a); when supplied, it is validated in the
// SAME atomic pass as `values` (I-3, I-4).
@InputType()
export class CreateClassificationEntryInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space to add the Classification to.',
  })
  spaceID!: string;

  @Field(() => String, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayLabel!: string;

  @Field(() => ClassificationCardinality, { nullable: false })
  cardinality!: ClassificationCardinality;

  @Field(() => [CreateClassificationValueInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateClassificationValueInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(CLASSIFICATION_VALUE_SET_MAX_SIZE)
  values!: CreateClassificationValueInput[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Optional selection to apply in the same write (FR-017a). Omitted -> selectedValueIDs: [].',
  })
  @IsOptional()
  @ArrayMaxSize(CLASSIFICATION_VALUE_SET_MAX_SIZE)
  selectedValueIDs?: string[];
}
