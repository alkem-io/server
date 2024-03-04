import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateInnovationFlowFromTemplateInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  @IsOptional()
  innovationFlowID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The InnovationFlow template whose State definition will be used for the Innovation Flow',
  })
  inovationFlowTemplateID!: string;
}
