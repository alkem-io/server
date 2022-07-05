import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class OpportunityCollaborateInput {
  @Field(() => UUID, { nullable: false })
  opportunityID!: string;
}
