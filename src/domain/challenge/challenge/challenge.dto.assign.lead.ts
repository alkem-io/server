import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AssignChallengeLeadInput {
  @Field()
  organisationID!: string;

  @Field()
  challengeID!: string;
}
