import { AuthenticationType } from '@common/enums/authentication.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserAuthenticationResult {
  @Field(() => AuthenticationType, {
    description:
      'The Authentication Method used for this User. One of email, linkedin, microsoft, or unknown',
    nullable: false,
  })
  method!: AuthenticationType;

  @Field(() => Date, {
    description: 'When the Kratos Account for the user was created',
    nullable: true,
  })
  createdAt?: Date;
}
