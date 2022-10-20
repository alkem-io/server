import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@ArgsType()
export class OpportunityCreatedArgs {
  @Field(() => UUID, {
    description: 'The Challenge to receive the Opportunity from.',
    nullable: false,
  })
  challengeID!: string;
}
