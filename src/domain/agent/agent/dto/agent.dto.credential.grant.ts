import { CreateCredentialInput } from '@domain/agent/credential/dto/credential.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GrantCredentialToAgentInput extends CreateCredentialInput {
  @Field({
    nullable: false,
    description: 'The Agent to whom the credential is being granted.',
  })
  agentID!: string;
}
