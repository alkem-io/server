import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { ChallengePreferenceType } from '@common/enums/challenge.preference.type';

@InputType()
export class UpdateChallengePreferenceInput {
  @Field(() => UUID, {
    description: 'ID of the Challenge',
  })
  challengeID!: string;

  @Field(() => ChallengePreferenceType, {
    description: 'Type of the challenge preference',
  })
  type!: ChallengePreferenceType;

  @Field(() => String)
  value!: string;
}
