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
  CREDENTIAL_RULE_POLL_CREATED_BY,
  POLICY_RULE_POLL_CONTENT_UPDATE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { IPoll } from './poll.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { PollService } from './poll.service';

@Injectable()
export class PollAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private pollService: PollService
  ) {}

  async applyAuthorizationPolicy(
    pollID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const poll = await this.pollService.getPollOrFail(
      pollID,
      {
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
      }
    );
    if (!poll.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on poll reset auth:  ${pollID} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    poll.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        poll.authorization,
        parentAuthorization
      );

    poll.authorization = this.appendCredentialRules(poll);
    poll.authorization = this.appendPrivilegeRules(
      poll.authorization,
      poll
    );
    updatedAuthorizations.push(poll.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        poll.profile.id,
        poll.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(poll: IPoll): IAuthorizationPolicy {
    const authorization = poll.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Poll: ${poll.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (poll.createdBy) {
      const managePollCreatedByPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.UPDATE_CONTENT,
            AuthorizationPrivilege.CONTRIBUTE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: poll.createdBy,
            },
          ],
          CREDENTIAL_RULE_POLL_CREATED_BY
        );
      newRules.push(managePollCreatedByPolicy);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    poll: IPoll
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    switch (poll.contentUpdatePolicy) {
      case ContentUpdatePolicy.OWNER:
        break; // covered via dedicated rule above
      case ContentUpdatePolicy.ADMINS: {
        const updateContentPrivilegeAdmins =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.UPDATE,
            POLICY_RULE_POLL_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeAdmins);
        break;
      }
      case ContentUpdatePolicy.CONTRIBUTORS: {
        const updateContentPrivilegeContributors =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_POLL_CONTENT_UPDATE
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
