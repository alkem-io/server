import { Field, InputType } from '@nestjs/graphql';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

@InputType()
export class RoleSetCredentials {
  @Field()
  member!: CredentialDefinition;

  @Field()
  lead!: CredentialDefinition;
}