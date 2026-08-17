import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { CreateClassificationValueInput } from '@domain/common/classification-value/dto/classification.value.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';

@InputType()
export class CreateClassificationTemplateContentInput {
  @Field(() => ClassificationCardinality, { nullable: false })
  cardinality!: ClassificationCardinality;

  @Field(() => [CreateClassificationValueInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateClassificationValueInput)
  @ArrayMinSize(1)
  values!: CreateClassificationValueInput[];
}
