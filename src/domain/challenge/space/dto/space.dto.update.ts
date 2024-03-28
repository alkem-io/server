import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.update';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.update';

@InputType()
export class UpdateSpaceInput extends UpdateBaseChallengeInput {
  @Field(() => UpdateInnovationFlowInput, {
    nullable: true,
    description: 'The Profile of the InnovationFlow of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateInnovationFlowInput)
  innovationFlowData?: UpdateInnovationFlowInput;
}
