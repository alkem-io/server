import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ClassificationTemplateContent', {
  description:
    'Cardinality + value set of a Classification Template. Null unless type == CLASSIFICATION.',
})
export abstract class ClassificationTemplateContent {
  @Field(() => ClassificationCardinality, { nullable: false })
  cardinality!: ClassificationCardinality;

  @Field(() => [ClassificationValue], { nullable: false })
  values!: ClassificationValue[];
}
