import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcosystemModelService } from './ecosystem-model.service';
import {
  EcosystemModel,
  IEcosystemModel,
} from '@domain/context/ecosystem-model';
import { ActorGroupAuthorizationService } from '@domain/context/actor-group/actor-group.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class EcosystemModelAuthorizationService {
  constructor(
    private ecosystemModelService: EcosystemModelService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private actorGroupAuthorizationService: ActorGroupAuthorizationService,
    @InjectRepository(EcosystemModel)
    private ecosystemModelRepository: Repository<EcosystemModel>
  ) {}

  async applyAuthorizationPolicy(
    ecosystemModel: IEcosystemModel
  ): Promise<IEcosystemModel> {
    for (const actorGroup of this.ecosystemModelService.getActorGroups(
      ecosystemModel
    )) {
      actorGroup.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          actorGroup.authorization,
          ecosystemModel.authorization
        );
      await this.actorGroupAuthorizationService.applyAuthorizationPolicy(
        actorGroup,
        ecosystemModel.authorization
      );
    }

    return await this.ecosystemModelRepository.save(ecosystemModel);
  }
}
