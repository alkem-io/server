import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommentsService } from './comments.service';
import { IComments } from './comments.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { RoomService } from '../room/room.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class CommentsAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private commentsService: CommentsService,
    private roomService: RoomService
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

    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_COMMENT],
      AuthorizationPrivilege.CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  async extendAuthorizationPolicyForMessageSender(
    comments: IComments,
    messageID: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await this.roomService.getUserIdForMessage(
      comments,
      messageID
    );

    if (senderUserID !== '') {
      const messageSender =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: senderUserID,
            },
          ]
        );
      newRules.push(messageSender);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        comments.authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
