import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AssignChallengeLeadInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  organisationID!: string;

  @Field(() => UUID, { nullable: false })
  challengeID!: string;
}
