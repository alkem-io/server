import { CredentialDefinition } from '@domain/actor/credential/credential.definition';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoleSetRoleSelectionCredentials {
  @Field()
  entryRole!: CredentialDefinition;

  @Field()
  elevatedRole!: CredentialDefinition;
}
