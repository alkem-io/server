import { Field, InputType } from '@nestjs/graphql';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

@InputType()
export class RoleSetMemberCredentials {
  @Field()
  member!: CredentialDefinition;

  @Field({ nullable: true })
  parentRoleSetMember?: CredentialDefinition;
}
