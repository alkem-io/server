import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowLifecycleTemplateInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  innovationFlowID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Innovation Flow Template to use for updating the lifecycle used in this Innovation Flow.',
  })
  innovationFlowTemplateID!: string;
}
