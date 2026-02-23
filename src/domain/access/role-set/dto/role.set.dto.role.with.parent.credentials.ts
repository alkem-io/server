import { CredentialDefinition } from '@domain/actor/credential/credential.definition';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoleSetRoleWithParentCredentials {
  @Field()
  role!: CredentialDefinition;

  @Field({ nullable: true })
  parentRoleSetRole?: CredentialDefinition;
}
