import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class AdminInnovationFlowSynchronizeStatesInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  @IsOptional()
  innovationFlowID!: string;
}
