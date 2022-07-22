import { IProfile } from '@domain/community/profile/profile.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Contributor')
export abstract class IContributor extends INameable {
  profile?: IProfile;

  agent?: IAgent;
}
