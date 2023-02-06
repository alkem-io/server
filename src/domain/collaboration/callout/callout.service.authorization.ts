import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from './callout.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AspectAuthorizationService } from '@domain/collaboration/aspect/aspect.service.authorization';
import {
  LogContext,
  AuthorizationPrivilege,
  AuthorizationCredential,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';
import { AspectTemplateAuthorizationService } from '@domain/template/aspect-template/aspect.template.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CalloutType } from '@common/enums/callout.type';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CanvasTemplateAuthorizationService } from '@domain/template/canvas-template/canvas.template.service.authorization';
import {
  CREDENTIAL_RULE_CALLOUT_CREATED_BY,
  CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS,
  POLICY_RULE_CALLOUT_CREATE,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
} from '@common/constants';
@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    private aspectTemplateAuthorizationService: AspectTemplateAuthorizationService,
    private canvasTemplateAuthorizationService: CanvasTemplateAuthorizationService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async applyAuthorizationPolicy(
    callout: ICallout,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ICallout> {
    callout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        callout.authorization,
        parentAuthorization
      );

    callout.authorization = this.appendPrivilegeRules(
      callout.authorization,
      callout.type
    );

    callout.authorization = this.appendCredentialRules(callout);

    callout.aspects = await this.calloutService.getAspectsFromCallout(callout);
    for (const aspect of callout.aspects) {
      await this.aspectAuthorizationService.applyAuthorizationPolicy(
        aspect,
        callout.authorization,
        communityPolicy
      );
    }

    callout.canvases = await this.calloutService.getCanvasesFromCallout(
      callout
    );
    for (const canvas of callout.canvases) {
      await this.canvasAuthorizationService.applyAuthorizationPolicy(
        canvas,
        callout.authorization
      );
    }

    callout.comments = await this.calloutService.getCommentsFromCallout(
      callout.id
    );
    if (callout.comments) {
      callout.comments =
        await this.commentsAuthorizationService.applyAuthorizationPolicy(
          callout.comments,
          callout.authorization
        );
    }

    callout.cardTemplate = await this.calloutService.getCardTemplateFromCallout(
      callout.id
    );
    if (callout.cardTemplate) {
      callout.cardTemplate =
        await this.aspectTemplateAuthorizationService.applyAuthorizationPolicy(
          callout.cardTemplate,
          callout.authorization
        );
    }

    callout.canvasTemplate =
      await this.calloutService.getCanvasTemplateFromCallout(callout.id);
    if (callout.canvasTemplate) {
      callout.canvasTemplate =
        await this.canvasTemplateAuthorizationService.applyAuthorizationPolicy(
          callout.canvasTemplate,
          callout.authorization
        );
    }

    return await this.calloutRepository.save(callout);
  }

  private appendCredentialRules(callout: ICallout): IAuthorizationPolicy {
    const authorization = callout.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Callout',
        LogContext.COLLABORATION
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (callout.createdBy) {
      const manageCreatedCalloutPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: callout.createdBy,
            },
          ],
          CREDENTIAL_RULE_CALLOUT_CREATED_BY
        );
      newRules.push(manageCreatedCalloutPolicy);
    }

    const calloutPublishUpdate =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ],
        CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS
      );
    calloutPublishUpdate.inheritable = false;
    newRules.push(calloutPublishUpdate);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    calloutType: CalloutType
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const privilegeToGrant = this.getPrivilegeForCalloutType(calloutType);
    if (privilegeToGrant) {
      const createPrivilege = new AuthorizationPolicyRulePrivilege(
        [privilegeToGrant],
        AuthorizationPrivilege.CREATE,
        POLICY_RULE_CALLOUT_CREATE
      );
      privilegeRules.push(createPrivilege);

      const contributorsPrivilege = new AuthorizationPolicyRulePrivilege(
        [privilegeToGrant],
        AuthorizationPrivilege.CONTRIBUTE,
        POLICY_RULE_CALLOUT_CONTRIBUTE
      );
      privilegeRules.push(contributorsPrivilege);
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  private getPrivilegeForCalloutType(
    calloutType: CalloutType
  ): AuthorizationPrivilege | undefined {
    switch (calloutType) {
      case CalloutType.CANVAS:
        return AuthorizationPrivilege.CREATE_CANVAS;
      case CalloutType.CARD:
        return AuthorizationPrivilege.CREATE_ASPECT;
      case CalloutType.COMMENTS:
        return undefined;
    }
  }
}
