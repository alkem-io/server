import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateInnovationFlowTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => LifecycleDefinitionScalar, {
    nullable: true,
    description: 'The XState definition for this InnovationFlowTemplate.',
  })
  @IsOptional()
  definition?: string;
}
