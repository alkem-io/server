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
  CREDENTIAL_RULE_WHITEBOARD_RT_ACCESS,
  POLICY_RULE_WHITEBOARD_CONTRIBUTE,
  POLICY_RULE_WHITEBOARD_UPDATE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { WhiteboardRtService } from './whiteboard.rt.service';
import { IWhiteboardRt } from './whiteboard.rt.interface';

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
      whiteboardRt.authorization
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

      const manageWhiteboardRtPolicy =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.ACCESS_WHITEBOARD_RT],
          [AuthorizationCredential.BETA_TESTER],
          CREDENTIAL_RULE_WHITEBOARD_RT_ACCESS
        );
      newRules.push(manageWhiteboardRtPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_WHITEBOARD],
      AuthorizationPrivilege.UPDATE,
      POLICY_RULE_WHITEBOARD_UPDATE
    );
    privilegeRules.push(createPrivilege);

    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_WHITEBOARD],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_WHITEBOARD_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
