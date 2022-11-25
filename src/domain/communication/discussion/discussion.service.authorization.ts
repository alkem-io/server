import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IDiscussion } from './discussion.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DiscussionService } from './discussion.service';
import { AuthorizationCredential } from '@common/enums';
import { RoomService } from '../room/room.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

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
          ]
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
