import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowTemplateInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  innovationFlowID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Innovation Flow template to use for the Challenge.',
  })
  innovationFlowTemplateID!: string;
}
