import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class OpportunityCollaborationInput {
  @Field(() => UUID, { nullable: false })
  opportunityID!: string;
}
