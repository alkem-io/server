import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextService } from './context.service';
import { Context, IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IContext> {
    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        parentAuthorization
      );

    // cascade
    context.ecosystemModel = await this.contextService.getEcosystemModel(
      context
    );
    context.ecosystemModel.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        context.ecosystemModel.authorization,
        context.authorization
      );
    context.ecosystemModel =
      await this.ecosysteModelAuthorizationService.applyAuthorizationPolicy(
        context.ecosystemModel
      );

    context.visuals = await this.contextService.getVisuals(context);
    for (const visual of context.visuals) {
      visual.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          visual.authorization,
          context.authorization
        );
    }

    context.references = await this.contextService.getReferences(context);
    for (const reference of context.references) {
      reference.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          context.authorization
        );
    }

    context.recommendations = await this.contextService.getRecommendations(
      context
    );
    for (const recommendation of context.recommendations) {
      recommendation.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          recommendation.authorization,
          context.authorization
        );
    }

    return await this.contextRepository.save(context);
  }
}
