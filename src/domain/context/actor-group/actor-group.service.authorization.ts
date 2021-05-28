import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { ActorGroup } from './actor-group.entity';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { IActorGroup } from './actor-group.interface';

@Injectable()
export class ActorGroupAuthorizationService {
  constructor(
    private actorGroupService: ActorGroupService,
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>
  ) {}

  async applyAuthorizationRules(actorGroup: IActorGroup): Promise<IActorGroup> {
    // cascade
    for (const actor of this.actorGroupService.getActors(actorGroup)) {
      actor.authorization = await this.authorizationEngine.inheritParentAuthorization(
        actor.authorization,
        actorGroup.authorization
      );
    }

    return await this.actorGroupRepository.save(actorGroup);
  }
}
