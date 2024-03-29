import { IAgent } from '@domain/agent/agent/agent.interface';
import { ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';

@ObjectType('Contributor')
export abstract class IContributor extends INameable {
  agent?: IAgent;
}
