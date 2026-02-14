import { AgentType } from '@common/enums/agent.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

export class Agent extends AuthorizableEntity implements IAgent {
  credentials?: Credential[];

  type!: AgentType;
}
