import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UserAuthorizationPrivilegesInput {
  @Field(() => UUID, {
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
