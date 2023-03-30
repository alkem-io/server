import { LIFECYCLE_DEFINITION_LENGTH } from '@common/constants/entity.field.length.constants';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateInnovationFlowTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => LifecycleDefinitionScalar, {
    nullable: true,
    description: 'The XState definition for this InnovationFlowTemplate.',
  })
  @IsOptional()
  @MaxLength(LIFECYCLE_DEFINITION_LENGTH)
  definition?: string;
}
