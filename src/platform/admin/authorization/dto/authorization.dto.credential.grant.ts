import { InputType, Field } from '@nestjs/graphql';
import { AuthorizationCredential } from '@common/enums';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class GrantAuthorizationCredentialInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The user to whom the credential is being granted.',
  })
  userID!: string;

  @Field(() => AuthorizationCredential, {
    nullable: false,
  })
  type!: AuthorizationCredential;

  @Field(() => UUID, {
    nullable: true,
    description: 'The resource to which this credential is tied.',
  })
  resourceID?: string;
}
