import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { IActorGroup, ActorGroup } from '@domain/context/actor-group';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';

@Injectable()
export class ActorGroupAuthorizationService {
  constructor(
    private actorGroupService: ActorGroupService,
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>
  ) {}

  async applyAuthorizationRules(
    actorGroup: IActorGroup,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<IActorGroup> {
    actorGroup.authorization = this.authorizationEngine.inheritParentAuthorization(
      actorGroup.authorization,
      parentAuthorization
    );
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
