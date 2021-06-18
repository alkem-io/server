import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UserAuthorizationPrivilegesInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The user to evaluate privileges granted based on held credentials.',
  })
  userID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The authorization definition to evaluate the user credentials against.',
  })
  authorizationID!: string;
}
