import { Injectable } from '@nestjs/common';
import { EcosystemModelService } from './ecosystem-model.service';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { ActorGroupAuthorizationService } from '@domain/context/actor-group/actor-group.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class EcosystemModelAuthorizationService {
  constructor(
    private ecosystemModelService: EcosystemModelService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private actorGroupAuthorizationService: ActorGroupAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    ecosystemModel: IEcosystemModel,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    ecosystemModel.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        ecosystemModel.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(ecosystemModel.authorization);

    for (const actorGroup of this.ecosystemModelService.getActorGroups(
      ecosystemModel
    )) {
      const actorGroupAuthorizations =
        await this.actorGroupAuthorizationService.applyAuthorizationPolicy(
          actorGroup,
          ecosystemModel.authorization
        );
      updatedAuthorizations.push(...actorGroupAuthorizations);
    }

    return updatedAuthorizations;
  }
}
