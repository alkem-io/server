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
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { AspectAuthorizationService } from '../../collaboration/aspect/aspect.service.authorization';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: CredentialDefinition
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
    context.authorization = this.appendPrivilegeRules(context.authorization);
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
    membershipCredential: CredentialDefinition
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${contextID}`,
        LogContext.CONTEXT
      );

    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const communityMemberNotInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE_ASPECT,
        AuthorizationPrivilege.CREATE_CANVAS,
      ],
      membershipCredential.type,
      membershipCredential.resourceID
    );
    communityMemberNotInherited.inheritable = false;
    newRules.push(communityMemberNotInherited);

    // separate rule as do want the update canvas / ability to create a comment to cascade
    const communityMemberInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.UPDATE_CANVAS,
        AuthorizationPrivilege.CREATE_COMMENT,
      ],
      membershipCredential.type,
      membershipCredential.resourceID
    );
    newRules.push(communityMemberInherited);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_CANVAS,
        AuthorizationPrivilege.CREATE_ASPECT,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
