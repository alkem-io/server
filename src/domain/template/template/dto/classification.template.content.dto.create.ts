import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { CLASSIFICATION_VALUE_SET_MAX_SIZE } from '@domain/common/classification-value/classification.value.interface';
import { CreateClassificationValueInput } from '@domain/common/classification-value/dto/classification.value.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';

@InputType()
export class CreateClassificationTemplateContentInput {
  @Field(() => ClassificationCardinality, { nullable: false })
  cardinality!: ClassificationCardinality;

  @Field(() => [CreateClassificationValueInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateClassificationValueInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(CLASSIFICATION_VALUE_SET_MAX_SIZE)
  values!: CreateClassificationValueInput[];
}
