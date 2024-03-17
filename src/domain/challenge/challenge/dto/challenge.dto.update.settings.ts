import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateChallengeSettingsInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Challenge whose settings are to be updated.',
  })
  challengeID!: string;
}
