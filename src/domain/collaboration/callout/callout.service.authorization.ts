import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from './callout.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  LogContext,
  AuthorizationPrivilege,
  AuthorizationCredential,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CalloutType } from '@common/enums/callout.type';
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
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';

@Injectable()
export class CalloutAuthorizationService {
  constructor(
    private calloutService: CalloutService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutFramingAuthorizationService: CalloutFramingAuthorizationService,
    private roomAuthorizationService: RoomAuthorizationService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async applyAuthorizationPolicy(
    calloutInput: ICallout,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      calloutInput.id,
      {
        relations: {
          comments: true,
          contributions: true,
          contributionDefaults: true,
          contributionPolicy: true,
          framing: {
            profile: true,
            whiteboard: {
              profile: true,
            },
          },
        },
      }
    );

    if (
      !callout.contributions ||
      !callout.contributionDefaults ||
      !callout.contributionPolicy
    ) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load callout: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

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

    const contributions: ICalloutContribution[] = [];
    for (const contribution of callout.contributions) {
      const updatedContribution =
        await this.contributionAuthorizationService.applyAuthorizationPolicy(
          contribution,
          callout.authorization,
          communityPolicy
        );
      contributions.push(updatedContribution);
    }
    callout.contributions = contributions;

    callout.framing =
      await this.calloutFramingAuthorizationService.applyAuthorizationPolicy(
        callout.framing,
        callout.authorization
      );

    if (callout.comments) {
      callout.comments =
        await this.roomAuthorizationService.applyAuthorizationPolicy(
          callout.comments,
          callout.authorization
        );
      callout.comments.authorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          callout.comments.authorization
        );
      callout.comments.authorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          callout.comments.authorization
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
      case CalloutType.WHITEBOARD_COLLECTION:
        return AuthorizationPrivilege.CREATE_WHITEBOARD;
      case CalloutType.POST_COLLECTION:
        return AuthorizationPrivilege.CREATE_POST;
      case CalloutType.POST:
        return undefined;
    }
  }
}
