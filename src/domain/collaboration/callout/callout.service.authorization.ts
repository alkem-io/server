import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from './callout.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  LogContext,
  AuthorizationPrivilege,
  AuthorizationCredential,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_CALLOUT_CREATED_BY,
  CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS,
  POLICY_RULE_CALLOUT_CREATE,
  POLICY_RULE_CALLOUT_CONTRIBUTE,
} from '@common/constants';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { CalloutFramingAuthorizationService } from '../callout-framing/callout.framing.service.authorization';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';

@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutFramingAuthorizationService: CalloutFramingAuthorizationService,
    private roomAuthorizationService: RoomAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    calloutID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        comments: true,
        contributions: true,
        contributionDefaults: true,
        settings: true,
        framing: {
          profile: true,
          whiteboard: {
            profile: true,
          },
        },
      },
    });

    if (
      !callout.contributions ||
      !callout.contributionDefaults ||
      !callout.settings ||
      !callout.settings.contribution ||
      !callout.framing
    ) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load callout entities for auth reset: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    callout.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        callout.authorization,
        parentAuthorization
      );

    callout.authorization = this.appendPrivilegeRules(
      callout.authorization,
      callout.settings.contribution.allowedTypes
    );

    callout.authorization = this.appendCredentialRules(callout);
    updatedAuthorizations.push(callout.authorization);

    for (const contribution of callout.contributions) {
      const updatedContributionAuthorizations =
        await this.contributionAuthorizationService.applyAuthorizationPolicy(
          contribution.id,
          callout.authorization,
          roleSet,
          spaceSettings
        );
      updatedAuthorizations.push(...updatedContributionAuthorizations);
    }

    const framingAuthorizations =
      await this.calloutFramingAuthorizationService.applyAuthorizationPolicy(
        callout.framing,
        callout.authorization
      );
    updatedAuthorizations.push(...framingAuthorizations);

    if (callout.comments) {
      let commentsAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          callout.comments,
          callout.authorization
        );
      commentsAuthorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          commentsAuthorization
        );
      commentsAuthorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          commentsAuthorization
        );
      updatedAuthorizations.push(commentsAuthorization);
    }

    return updatedAuthorizations;
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
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_CALLOUT_UPDATE_PUBLISHER_ADMINS
      );
    calloutPublishUpdate.cascade = false;
    newRules.push(calloutPublishUpdate);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    allowedContributions: CalloutContributionType[] | undefined
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const privilegesToGrant =
      this.getPrivilegesForCalloutAllowedContributions(allowedContributions);
    for (const privilegeToGrant of privilegesToGrant) {
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

  private getPrivilegesForCalloutAllowedContributions(
    allowedContributions: CalloutContributionType[] | undefined
  ): AuthorizationPrivilege[] {
    const privilegesToGrant: AuthorizationPrivilege[] = [];
    if (!allowedContributions || allowedContributions.length === 0) {
      return privilegesToGrant;
    } else {
      if (allowedContributions.includes(CalloutContributionType.LINK)) {
        privilegesToGrant.push(AuthorizationPrivilege.CONTRIBUTE);
      }
      if (allowedContributions.includes(CalloutContributionType.POST)) {
        privilegesToGrant.push(AuthorizationPrivilege.CREATE_POST);
      }
      if (allowedContributions.includes(CalloutContributionType.WHITEBOARD)) {
        privilegesToGrant.push(AuthorizationPrivilege.CREATE_WHITEBOARD);
      }
      return privilegesToGrant;
    }
  }
}
