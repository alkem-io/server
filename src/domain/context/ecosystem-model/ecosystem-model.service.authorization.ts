import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { EcosystemModelService } from './ecosystem-model.service';
import {
  EcosystemModel,
  IEcosystemModel,
} from '@domain/context/ecosystem-model';
import { ActorGroupAuthorizationService } from '@domain/context/actor-group/actor-group.service.authorization';

@Injectable()
export class EcosystemModelAuthorizationService {
  constructor(
    private ecosystemModelService: EcosystemModelService,
    private authorizationEngine: AuthorizationEngineService,
    private actorGroupAuthorizationService: ActorGroupAuthorizationService,
    @InjectRepository(EcosystemModel)
    private ecosystemModelRepository: Repository<EcosystemModel>
  ) {}

  async applyAuthorizationRules(
    ecosystemModel: IEcosystemModel
  ): Promise<IEcosystemModel> {
    // cascade

    for (const actorGroup of this.ecosystemModelService.getActorGroups(
      ecosystemModel
    )) {
      actorGroup.authorization = await this.authorizationEngine.inheritParentAuthorization(
        actorGroup.authorization,
        ecosystemModel.authorization
      );
      await this.actorGroupAuthorizationService.applyAuthorizationRules(
        actorGroup,
        ecosystemModel.authorization
      );
    }

    return await this.ecosystemModelRepository.save(ecosystemModel);
  }
}
