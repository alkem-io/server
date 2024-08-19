import { Injectable } from '@nestjs/common';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { IActorGroup } from '@domain/context/actor-group';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ActorGroupAuthorizationService {
  constructor(
    private actorGroupService: ActorGroupService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    actorGroup: IActorGroup,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    actorGroup.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        actorGroup.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(actorGroup.authorization);
    // cascade
    for (const actor of this.actorGroupService.getActors(actorGroup)) {
      actor.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          actor.authorization,
          actorGroup.authorization
        );
      updatedAuthorizations.push(actor.authorization);
    }

    return updatedAuthorizations;
  }
}
