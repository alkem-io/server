import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class ConvertOpportunityToChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The Opportunity to be promoted to be a new Challenge. Note: the original Opportunity will no longer exist after the conversion. ',
  })
  opportunityID!: string;
}
