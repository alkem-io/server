import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IDiscussion } from './discussion.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DiscussionService } from './discussion.service';
import { AuthorizationCredential } from '@common/enums';
import { RoomService } from '../room/room.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import {
  POLICY_RULE_DISCUSSION_CONTRIBUTE,
  POLICY_RULE_DISCUSSION_CREATE,
  CREDENTIAL_RULE_DISCUSSION_MESSAGE_SENDER,
} from '@common/constants';

@Injectable()
export class DiscussionAuthorizationService {
  /*
  Discussions have a fairly open authorization policy, for now.
  Any user that is a member of the community in which the Discussion takes place has the CREATE privilege.
  The CREATE privilege gives the user the right to create new discussions, as well as to post messages to the Discussion.
  Note: the CREATE privilege is inherited from the Communication parent entity.
  */
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private discussionService: DiscussionService,
    private roomService: RoomService
  ) {}

  async applyAuthorizationPolicy(
    discussion: IDiscussion,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IDiscussion> {
    discussion.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        discussion.authorization,
        parentAuthorization
      );

    discussion.authorization = this.extendAuthorizationPolicy(
      discussion.authorization
    );

    discussion.authorization = this.appendPrivilegeRules(
      discussion.authorization
    );

    return await this.discussionService.save(discussion);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    // Allow any contributor to this community to create discussions, and to send messages to the discussion
    const contributePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_COMMENT],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_DISCUSSION_CONTRIBUTE
    );
    privilegeRules.push(contributePrivilege);

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_COMMENT],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_DISCUSSION_CREATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  async extendAuthorizationPolicyForMessageSender(
    discussion: IDiscussion,
    messageID: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await this.roomService.getUserIdForMessage(
      discussion,
      messageID
    );

    // Allow any member of this community to create messages on the discussion
    if (senderUserID !== '') {
      const messageSender =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: senderUserID,
            },
          ],
          CREDENTIAL_RULE_DISCUSSION_MESSAGE_SENDER
        );
      newRules.push(messageSender);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        discussion.authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
