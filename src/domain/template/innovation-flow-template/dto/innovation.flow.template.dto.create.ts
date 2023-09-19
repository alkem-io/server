import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateInnovationFlowTemplateInput extends CreateTemplateBaseInput {
  @Field(() => InnovationFlowType, {
    nullable: false,
    description: 'The type of the InnovationFlows that this Template supports.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: false,
    description: 'The XState definition for this InnovationFlowTemplate.',
  })
  definition!: string;
}
