import { AuthenticationType } from '@common/enums/authentication.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserAuthenticationResult {
  @Field(() => [AuthenticationType], {
    description:
      'The Authentication Methods used for this User. One of email, linkedin, microsoft, github or unknown',
    nullable: false,
  })
  methods!: AuthenticationType[];

  @Field(() => Date, {
    description: 'When the Kratos Account for the user was created',
    nullable: true,
  })
  createdAt?: Date;

  @Field(() => Date, {
    description: 'When the Kratos Account for the user last logged in',
    nullable: true,
  })
  authenticatedAt?: Date;
}
