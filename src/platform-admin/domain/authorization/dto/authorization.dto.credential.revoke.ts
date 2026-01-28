import { AuthorizationCredential } from '@common/enums';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RevokeAuthorizationCredentialInput {
  @Field(() => UUID, {
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
