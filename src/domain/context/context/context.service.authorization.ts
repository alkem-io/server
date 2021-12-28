import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextService } from './context.service';
import { Context, IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ICredential } from '@domain/agent/credential/credential.interface';

@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): Promise<IContext> {
    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        parentAuthorization
      );

    context.authorization = this.appendCredentialRules(
      context.authorization,
      context.id,
      communityCredential
    );
    // cascade
    const ecosystemModel = await this.contextService.getEcosystemModel(context);
    ecosystemModel.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        ecosystemModel.authorization,
        context.authorization
      );
    context.ecosystemModel =
      await this.ecosysteModelAuthorizationService.applyAuthorizationPolicy(
        ecosystemModel
      );

    context.aspects = await this.contextService.getAspects(context);
    for (const aspect of context.aspects) {
      aspect.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          aspect.authorization,
          context.authorization
        );
    }

    const canvases = await this.contextService.getCanvases(context);
    const updatedCanvases: ICanvas[] = [];
    for (const canvas of canvases) {
      const updatedCanvas =
        await this.canvasAuthorizationService.applyAuthorizationPolicy(
          canvas,
          context.authorization
        );
      updatedCanvases.push(updatedCanvas);
    }
    context.canvases = updatedCanvases;

    context.references = await this.contextService.getReferences(context);
    for (const reference of context.references) {
      if (!reference.authorization) {
        reference.authorization = new AuthorizationPolicy();
      }
      reference.authorization =
        await this.authorizationPolicyService.inheritParentAuthorization(
          reference.authorization,
          context.authorization
        );
    }

    return await this.contextRepository.save(context);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    contextID: string,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${contextID}`,
        LogContext.COMMUNITY
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.CREATE_CANVAS],
      communityCredential.type,
      communityCredential.resourceID,
      false
    );
    newRules.push(communityMember);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
