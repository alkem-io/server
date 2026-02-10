import { AuthorizationCredential } from '@common/enums';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GrantAuthorizationCredentialInput {
  @Field(() => UUID, {
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
