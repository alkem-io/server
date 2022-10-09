import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class ConvertChallengeToHubInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The Challenge to be promoted to be a new Hub. Note: the original Challenge will no longer exist after the conversion. ',
  })
  challengeID!: string;
}
