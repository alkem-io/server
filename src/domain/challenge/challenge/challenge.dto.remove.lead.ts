import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RemoveChallengeLeadInput {
  @Field()
  organisationID!: string;

  @Field()
  challengeID!: string;
}
