import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { IActorGroup, ActorGroup } from '@domain/context/actor-group';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ActorGroupAuthorizationService {
  constructor(
    private actorGroupService: ActorGroupService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>
  ) {}

  async applyAuthorizationPolicy(
    actorGroup: IActorGroup,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IActorGroup> {
    actorGroup.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        actorGroup.authorization,
        parentAuthorization
      );
    // cascade
    for (const actor of this.actorGroupService.getActors(actorGroup)) {
      actor.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          actor.authorization,
          actorGroup.authorization
        );
    }

    return await this.actorGroupRepository.save(actorGroup);
  }
}
