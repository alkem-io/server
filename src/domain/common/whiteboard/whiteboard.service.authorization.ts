import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_WHITEBOARD_CREATED_BY,
  POLICY_RULE_WHITEBOARD_CONTENT_UPDATE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { IWhiteboard } from './whiteboard.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { WhiteboardService } from './whiteboard.service';

@Injectable()
export class WhiteboardAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardService: WhiteboardService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardInput: IWhiteboard,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardInput.id,
      {
        relations: {
          profile: true,
        },
      }
    );
    if (!whiteboard.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on whiteboard reset auth:  ${whiteboard.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    whiteboard.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboard.authorization,
        parentAuthorization
      );

    whiteboard.authorization = this.appendCredentialRules(whiteboard);
    whiteboard.authorization = this.appendPrivilegeRules(
      whiteboard.authorization,
      whiteboard
    );
    updatedAuthorizations.push(whiteboard.authorization);

    const profileAuthoriations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboard.profile,
        whiteboard.authorization
      );
    updatedAuthorizations.push(...profileAuthoriations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(whiteboard: IWhiteboard): IAuthorizationPolicy {
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
            AuthorizationPrivilege.UPDATE_CONTENT,
            AuthorizationPrivilege.CONTRIBUTE,
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
    authorization: IAuthorizationPolicy,
    whiteboard: IWhiteboard
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    switch (whiteboard.contentUpdatePolicy) {
      case ContentUpdatePolicy.OWNER:
        break; // covered via dedicated rule above
      case ContentUpdatePolicy.ADMINS:
        const updateContentPrivilegeAdmins =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.UPDATE,
            POLICY_RULE_WHITEBOARD_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeAdmins);
        break;
      case ContentUpdatePolicy.CONTRIBUTORS:
        const updateContentPrivilegeContributors =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_WHITEBOARD_CONTENT_UPDATE
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
