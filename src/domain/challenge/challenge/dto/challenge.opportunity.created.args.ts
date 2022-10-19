import { ArgsType, Field } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';

@ArgsType()
export class OpportunityCreatedArgs {
  @Field(() => UUID_NAMEID, {
    description: 'The Challenge to receive the Opportunity from.',
    nullable: false,
  })
  challengeID!: string;
}
