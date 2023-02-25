import { IProfile } from '@domain/community/profile/profile.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ObjectType } from '@nestjs/graphql';
import { INameable2 } from '@domain/common/entity/nameable-entity/nameable2.interface';

@ObjectType('Contributor')
export abstract class IContributor extends INameable2 {
  profile?: IProfile;

  agent?: IAgent;
}
