import { Agent } from '@domain/agent/agent/agent.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { IContributorBase } from './contributor.base.interface';

export class ContributorBase
  extends NameableEntity
  implements IContributorBase
{
  declare nameID: string;
  agent!: Agent;
}
