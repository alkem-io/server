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

  @Field(() => UUID, {
    description:
      'ID of the Profile of the Entity (Usually Callout) that needs to be updated',
  })
  @IsOptional()
  profileID!: string;
}
