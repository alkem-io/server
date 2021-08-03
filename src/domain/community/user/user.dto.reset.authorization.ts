import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UserAuthorizationResetInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The identifier of the User whose Authorization Policy should be reset.',
  })
  userID!: string;
}
