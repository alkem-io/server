import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class UpdateInnovationFlowTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => [UpdateInnovationFlowStateInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  states!: UpdateInnovationFlowStateInput[];
}
