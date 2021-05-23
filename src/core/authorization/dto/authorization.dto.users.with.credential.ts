import { AuthorizationCredential } from '@common/enums';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UsersWithAuthorizationCredentialInput {
  @Field(() => AuthorizationCredential, {
    nullable: false,
    description: 'The type of credential.',
  })
  type!: AuthorizationCredential;

  @Field(() => UUID, {
    nullable: true,
    description: 'The resource to which a credential needs to be bound.',
  })
  resourceID?: string;
}
