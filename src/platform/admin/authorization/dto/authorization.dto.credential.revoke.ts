import { AuthorizationCredential } from '@common/enums';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RevokeAuthorizationCredentialInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The user from whom the credential is being removed.',
  })
  userID!: string;

  @Field(() => AuthorizationCredential, {
    nullable: false,
  })
  type!: AuthorizationCredential;

  @Field({
    nullable: false,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: string;
}
