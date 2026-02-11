import { IAgent } from '@domain/agent/agent/agent.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('ContributorBase')
export abstract class IContributorBase extends INameable {
  agent!: IAgent;
}
