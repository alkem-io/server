import { InputType, Field } from '@nestjs/graphql';
import { AuthorizationCredential } from '@core/authorization';

@InputType()
export class UsersWithAuthorizationCredentialInput {
  @Field(() => AuthorizationCredential, {
    nullable: false,
    description: 'The type of credential.',
  })
  type!: AuthorizationCredential;

  @Field({
    nullable: true,
    description: 'The resource to which a credential needs to be bound.',
  })
  resourceID?: number;
}
