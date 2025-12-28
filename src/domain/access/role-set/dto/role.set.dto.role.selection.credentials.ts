import { Field, InputType } from '@nestjs/graphql';
import { CredentialDefinition } from '@domain/actor/credential/credential.definition';

@InputType()
export class RoleSetRoleSelectionCredentials {
  @Field()
  entryRole!: CredentialDefinition;

  @Field()
  elevatedRole!: CredentialDefinition;
}
