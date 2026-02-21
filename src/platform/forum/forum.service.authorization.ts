import {
  CREDENTIAL_RULE_TYPES_FORUM_CONTRIBUTE,
  CREDENTIAL_RULE_TYPES_FORUM_READ,
  POLICY_RULE_FORUM_CREATE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { DiscussionAuthorizationService } from '../forum-discussion/discussion.service.authorization';
import { IForum } from './forum.interface';
import { ForumService } from './forum.service';

@Injectable()
export class ForumAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private forumService: ForumService,
    private discussionAuthorizationService: DiscussionAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    forumInput: IForum,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const forum = await this.forumService.getForumOrFail(forumInput.id, {
      relations: {
        discussions: {
          comments: true,
        },
      },
    });

    if (!forum.discussions) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for forum ${forum.id} `,
        LogContext.COMMUNICATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    forum.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        forum.authorization,
        parentAuthorization
      );

    // Who can create
    const createRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_DISCUSSION],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_FORUM_READ
      );
    createRule.cascade = false;
    forum.authorization.credentialRules.push(createRule);

    const contributeRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CONTRIBUTE],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_FORUM_CONTRIBUTE
      );
    createRule.cascade = true;
    forum.authorization.credentialRules.push(contributeRule);

    const readRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [
          AuthorizationCredential.GLOBAL_ANONYMOUS,
          AuthorizationCredential.GLOBAL_REGISTERED,
        ],
        CREDENTIAL_RULE_TYPES_FORUM_READ
      );
    readRule.cascade = true;
    forum.authorization.credentialRules.push(readRule);

    forum.authorization = this.appendPrivilegeRules(forum.authorization);
    updatedAuthorizations.push(forum.authorization);

    for (const discussion of forum.discussions) {
      const updatedDiscussionAuthorizations =
        await this.discussionAuthorizationService.applyAuthorizationPolicy(
          discussion,
          forum.authorization
        );
      updatedAuthorizations.push(...updatedDiscussionAuthorizations);
    }

    return updatedAuthorizations;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_DISCUSSION],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_FORUM_CREATE
    );
    privilegeRules.push(createPrivilege);
    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
