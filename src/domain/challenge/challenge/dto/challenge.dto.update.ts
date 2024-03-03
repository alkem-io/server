import { Field, InputType } from '@nestjs/graphql';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateChallengeInput extends UpdateBaseChallengeInput {
  @Field(() => UpdateInnovationFlowInput, {
    nullable: true,
    description: 'The Profile of the InnovationFlow of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateInnovationFlowInput)
  innovationFlowData?: UpdateInnovationFlowInput;
}
