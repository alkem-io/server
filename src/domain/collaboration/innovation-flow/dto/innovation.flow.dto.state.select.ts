import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateInnovationFlowCurrentStateInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  @IsOptional()
  innovationFlowID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'ID of the Innovation Flow State to be selected as the current one.',
  })
  currentStateID!: string;
}
