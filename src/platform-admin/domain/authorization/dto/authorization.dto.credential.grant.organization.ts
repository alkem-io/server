import { InputType, Field } from '@nestjs/graphql';
import { AuthorizationCredential } from '@common/enums';
import { UUID } from '@domain/common/scalars';

@InputType()
export class GrantOrganizationAuthorizationCredentialInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Organization to whom the credential is being granted.',
  })
  organizationID!: string;

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
