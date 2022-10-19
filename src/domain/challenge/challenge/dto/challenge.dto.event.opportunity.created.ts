import { Field, ObjectType } from '@nestjs/graphql';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@ObjectType('OpportunityCreated')
export class OpportunityCreated {
  eventID!: string;

  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The identifier for the Challenge on which the Opportunity was created.',
  })
  challengeID!: string;

  @Field(() => IOpportunity, {
    nullable: false,
    description: 'The Opportunity that has been created.',
  })
  opportunity!: IOpportunity;
}
