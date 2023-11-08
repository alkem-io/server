import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_WHITEBOARD_CREATED_BY,
  POLICY_RULE_WHITEBOARD_RT_CONTENT_UPDATE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { WhiteboardRtService } from './whiteboard.rt.service';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@Injectable()
export class WhiteboardRtAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private whiteboardRtService: WhiteboardRtService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardRt: IWhiteboardRt,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IWhiteboardRt> {
    whiteboardRt.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboardRt.authorization,
        parentAuthorization
      );

    whiteboardRt.authorization = this.appendCredentialRules(whiteboardRt);
    whiteboardRt.authorization = this.appendPrivilegeRules(
      whiteboardRt.authorization,
      whiteboardRt
    );

    whiteboardRt.profile = await this.whiteboardRtService.getProfile(
      whiteboardRt
    );
    whiteboardRt.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboardRt.profile,
        whiteboardRt.authorization
      );

    return this.whiteboardRtService.save(whiteboardRt);
  }

  private appendCredentialRules(
    whiteboardRt: IWhiteboardRt
  ): IAuthorizationPolicy {
    const authorization = whiteboardRt.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for WhiteboardRt: ${whiteboardRt.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (whiteboardRt.createdBy) {
      const manageWhiteboardCreatedByPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.UPDATE_CONTENT,
            AuthorizationPrivilege.CONTRIBUTE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: whiteboardRt.createdBy,
            },
          ],
          CREDENTIAL_RULE_WHITEBOARD_CREATED_BY
        );
      newRules.push(manageWhiteboardCreatedByPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    whiteboardRt: IWhiteboardRt
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    switch (whiteboardRt.contentUpdatePolicy) {
      case ContentUpdatePolicy.OWNER:
        break; // covered via dedicated rule above
      case ContentUpdatePolicy.ADMINS:
        const updateContentPrivilegeAdmins =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.UPDATE,
            POLICY_RULE_WHITEBOARD_RT_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeAdmins);
        break;
      case ContentUpdatePolicy.CONTRIBUTORS:
        const updateContentPrivilegeContributors =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_WHITEBOARD_RT_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeContributors);
        break;
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
