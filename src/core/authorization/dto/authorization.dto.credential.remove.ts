import { AuthorizationCredential } from '@common/enums';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RemoveAuthorizationCredentialInput {
  @Field({
    nullable: false,
    description: 'The user from whom the credential is being removed.',
  })
  userID!: string;

  @Field(() => AuthorizationCredential, {
    nullable: false,
  })
  type!: AuthorizationCredential;

  @Field({
    nullable: true,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: string;
}
