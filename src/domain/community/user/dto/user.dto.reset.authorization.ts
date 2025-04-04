import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UserAuthorizationResetInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the User whose Authorization Policy should be reset.',
  })
  userID!: string;
}
