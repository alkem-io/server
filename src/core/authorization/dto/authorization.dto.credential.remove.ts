import { InputType, Field } from '@nestjs/graphql';
import { AuthorizationCredential } from '@core/authorization';

@InputType()
export class RemoveAuthorizationCredentialInput {
  @Field({
    nullable: false,
    description: 'The user from whom the credential is being removed.',
  })
  userID!: number;

  @Field({ nullable: false })
  type!: AuthorizationCredential;

  @Field({
    nullable: true,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: number;
}
