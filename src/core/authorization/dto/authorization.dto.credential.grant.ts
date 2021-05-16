import { InputType, Field } from '@nestjs/graphql';
import { AuthorizationCredential } from '../../../common/enums/authorization.credential';

@InputType()
export class GrantAuthorizationCredentialInput {
  @Field({
    nullable: false,
    description: 'The user to whom the credential is being granted.',
  })
  userID!: number;

  @Field(() => AuthorizationCredential, {
    nullable: false,
  })
  type!: AuthorizationCredential;

  @Field({
    nullable: true,
    description: 'The resource to which this credential is tied.',
  })
  resourceID?: number;
}
