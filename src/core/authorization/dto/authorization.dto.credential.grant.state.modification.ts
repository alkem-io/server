import { InputType, Field } from '@nestjs/graphql';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class GrantStateModificationVCInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The user to whom the credential is being granted.',
  })
  userID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The challenge whose state can be udpated.',
  })
  challengeID!: string;
}
