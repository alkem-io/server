import { AuthorizationCredential } from '@common/enums';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RevokeOrganizationAuthorizationCredentialInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Organization from whom the credential is being removed.',
  })
  organizationID!: string;

  @Field(() => AuthorizationCredential, {
    nullable: false,
  })
  type!: AuthorizationCredential;

  @Field(() => UUID, {
    nullable: true,
    description: 'The resource to which access is being removed.',
  })
  resourceID?: string;
}
