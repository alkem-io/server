import { Field, InputType } from '@nestjs/graphql';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

@InputType()
export class RoleSetRoleWithParentCredentials {
  @Field()
  role!: CredentialDefinition;

  @Field({ nullable: true })
  parentRoleSetRole?: CredentialDefinition;
}
