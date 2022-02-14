import { Injectable } from '@nestjs/common';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommentsService } from './comments.service';
import { IComments } from './comments.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Injectable()
export class CommentsAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsService: CommentsService
  ) {}

  async applyAuthorizationPolicy(
    comments: IComments,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IComments> {
    comments.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        comments.authorization,
        parentAuthorization
      );

    comments.authorization = this.appendPrivilegeRules(comments.authorization);

    return await this.commentsService.save(comments);
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_COMMENT],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
