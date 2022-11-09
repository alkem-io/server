import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from './callout.service';
import { ICallout, Callout } from '@domain/collaboration/callout';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AspectAuthorizationService } from '@domain/collaboration/aspect/aspect.service.authorization';
import { LogContext, AuthorizationPrivilege } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CommentsAuthorizationService } from '@domain/communication/comments/comments.service.authorization';
import { AspectTemplateAuthorizationService } from '@domain/template/aspect-template/aspect.template.service.authorization';

@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    private aspectTemplateAuthorizationService: AspectTemplateAuthorizationService,
    private commentsAuthorizationService: CommentsAuthorizationService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async applyAuthorizationPolicy(
    callout: ICallout,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: CredentialDefinition
  ): Promise<ICallout> {
    callout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        callout.authorization,
        parentAuthorization
      );

    callout.authorization = this.appendPrivilegeRules(callout.authorization);

    callout.authorization = this.appendCredentialRules(
      callout.authorization,
      callout.id,
      communityCredential
    );

    callout.aspects = await this.calloutService.getAspectsFromCallout(callout);
    for (const aspect of callout.aspects) {
      await this.aspectAuthorizationService.applyAuthorizationPolicy(
        aspect,
        callout.authorization
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

    return await this.calloutRepository.save(callout);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    calloutId: string,
    membershipCredential: CredentialDefinition
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Context: ${calloutId}`,
        LogContext.COLLABORATION
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

    const communityMemberInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.UPDATE_CANVAS,
        AuthorizationPrivilege.CREATE_COMMENT,
      ],
      membershipCredential.type,
      membershipCredential.resourceID
    );
    communityMemberInherited.inheritable = true;
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
        AuthorizationPrivilege.CREATE_ASPECT,
        AuthorizationPrivilege.CREATE_CANVAS,
        AuthorizationPrivilege.CREATE_COMMENT,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    const updatePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_CANVAS],
      AuthorizationPrivilege.UPDATE
    );
    privilegeRules.push(updatePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
