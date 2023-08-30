import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_WHITEBOARD_CREATED_BY,
  POLICY_RULE_WHITEBOARD_UPDATE,
  POLICY_RULE_WHITEBOARD_CONTRIBUTE,
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
    whiteboard: IWhiteboardRt,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IWhiteboardRt> {
    whiteboard.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboard.authorization,
        parentAuthorization
      );

    whiteboard.authorization = this.appendCredentialRules(whiteboard);
    whiteboard.authorization = this.appendPrivilegeRules(
      whiteboard.authorization
    );

    whiteboard.profile = await this.whiteboardRtService.getProfile(whiteboard);
    whiteboard.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboard.profile,
        whiteboard.authorization
      );

    return await this.whiteboardRtService.save(whiteboard);
  }

  private appendCredentialRules(
    whiteboard: IWhiteboardRt
  ): IAuthorizationPolicy {
    const authorization = whiteboard.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Whiteboard: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (whiteboard.createdBy) {
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
              resourceID: whiteboard.createdBy,
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
