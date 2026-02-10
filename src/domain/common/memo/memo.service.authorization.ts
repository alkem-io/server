import {
  CREDENTIAL_RULE_MEMO_CREATED_BY,
  POLICY_RULE_MEMO_CONTENT_UPDATE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { IMemo } from './memo.interface';
import { MemoService } from './memo.service';

@Injectable()
export class MemoAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private memoService: MemoService
  ) {}

  async applyAuthorizationPolicy(
    memoID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const memo = await this.memoService.getMemoOrFail(memoID, {
      loadEagerRelations: false,
      relations: {
        authorization: true,
        profile: {
          authorization: true,
        },
      },
      select: {
        id: true,
        createdBy: true,
        contentUpdatePolicy: true,
        authorization:
          this.authorizationPolicyService.authorizationSelectOptions,
        profile: {
          id: true,
        },
      },
    });
    if (!memo.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on memo reset auth:  ${memoID} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    memo.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        memo.authorization,
        parentAuthorization
      );

    memo.authorization = this.appendCredentialRules(memo);
    memo.authorization = this.appendPrivilegeRules(memo.authorization, memo);
    updatedAuthorizations.push(memo.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        memo.profile.id,
        memo.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(memo: IMemo): IAuthorizationPolicy {
    const authorization = memo.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Memo: ${memo.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (memo.createdBy) {
      const manageMemoCreatedByPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.UPDATE_CONTENT,
            AuthorizationPrivilege.CONTRIBUTE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: memo.createdBy,
            },
          ],
          CREDENTIAL_RULE_MEMO_CREATED_BY
        );
      newRules.push(manageMemoCreatedByPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    memo: IMemo
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    switch (memo.contentUpdatePolicy) {
      case ContentUpdatePolicy.OWNER:
        break; // covered via dedicated rule above
      case ContentUpdatePolicy.ADMINS: {
        const updateContentPrivilegeAdmins =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.UPDATE,
            POLICY_RULE_MEMO_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeAdmins);
        break;
      }
      case ContentUpdatePolicy.CONTRIBUTORS: {
        const updateContentPrivilegeContributors =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_MEMO_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeContributors);
        break;
      }
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
