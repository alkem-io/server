import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UpdateInnovationFlowInput } from './innovation.flow.dto.update';

@InputType()
export class UpdateInnovationFlowEntityInput extends UpdateInnovationFlowInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  @IsOptional()
  innovationFlowID!: string;
}
