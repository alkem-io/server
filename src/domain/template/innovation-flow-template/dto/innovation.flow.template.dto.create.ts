import { UpdateInnovationFlowStateInput } from '@domain/challenge/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
export class CreateInnovationFlowTemplateInput extends CreateTemplateBaseInput {
  @Field(() => [UpdateInnovationFlowStateInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  states!: UpdateInnovationFlowStateInput[];
}
