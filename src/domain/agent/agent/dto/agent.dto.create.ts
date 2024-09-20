import { AgentType } from '@common/enums/agent.type';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateAgentInput {
  type!: AgentType;
}
