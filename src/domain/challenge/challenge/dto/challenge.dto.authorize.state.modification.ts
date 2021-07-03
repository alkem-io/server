import { InputType, Field } from '@nestjs/graphql';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class ChallengeAuthorizeStateModificationInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The user who is being authorized to update the Challenge state.',
  })
  userID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The challenge whose state can be udpated.',
  })
  challengeID!: string;
}
