import { Field, InputType } from '@nestjs/graphql';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

@InputType()
export class CommunityCredentials {
  @Field()
  member!: CredentialDefinition;

  @Field()
  lead!: CredentialDefinition;
}
