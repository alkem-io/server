import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdateOpportunityInnovationFlowInput {
  @Field(() => UUID, {
    description: 'ID of the Opportunity',
  })
  opportunityID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Innovation Flow template to use for the Opportunity.',
  })
  innovationFlowTemplateID!: string;
}
