import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateInnovationFlowStateInput } from '@domain/challenge/innovation-flow-states/dto/innovation.flow.state.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateSpaceDefaultsInput extends UpdateBaseAlkemioInput {
  @Field(() => [UpdateInnovationFlowStateInput], {
    nullable: true,
    description: 'The default InnovationFlow to use for new Challenges.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  @IsOptional()
  challengeFlowStates?: string;

  @Field(() => [UpdateInnovationFlowStateInput], {
    nullable: true,
    description: 'The default InnovationFlow to use for new Opportunities.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  @IsOptional()
  opportunityFlowStates?: string;
}
