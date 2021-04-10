import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RemoveChallengeLeadInput {
  @Field({ nullable: false })
  organisationID!: string;

  @Field({ nullable: false })
  challengeID!: string;
}
