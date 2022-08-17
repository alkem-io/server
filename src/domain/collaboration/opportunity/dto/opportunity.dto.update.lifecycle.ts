import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { LifecycleDefinitionScalar } from '@domain/common/scalars/scalar.lifecycle.definition';

@InputType()
export class UpdateOpportunityInnovationFlowInput {
  @Field(() => UUID, {
    description: 'ID of the Opportunity',
  })
  opportunityID!: string;

  @Field(() => LifecycleDefinitionScalar, {
    nullable: false,
    description: 'The Innovation Flow Definition to use for this Opportunity.',
  })
  innovationFlowDefinition!: string;
}
