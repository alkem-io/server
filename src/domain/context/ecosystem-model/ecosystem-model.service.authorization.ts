import { Injectable } from '@nestjs/common';
import { EcosystemModelService } from './ecosystem-model.service';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { ActorGroupAuthorizationService } from '@domain/context/actor-group/actor-group.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

@Injectable()
export class EcosystemModelAuthorizationService {
  constructor(
    private ecosystemModelService: EcosystemModelService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private actorGroupAuthorizationService: ActorGroupAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    ecosystemModel: IEcosystemModel
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    for (const actorGroup of this.ecosystemModelService.getActorGroups(
      ecosystemModel
    )) {
      actorGroup.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          actorGroup.authorization,
          ecosystemModel.authorization
        );
      const updatedAuthorization =
        await this.actorGroupAuthorizationService.applyAuthorizationPolicy(
          actorGroup,
          ecosystemModel.authorization
        );
      updatedAuthorizations.push(...updatedAuthorization);
    }

    return updatedAuthorizations;
  }
}
