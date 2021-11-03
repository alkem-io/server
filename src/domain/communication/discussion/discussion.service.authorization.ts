import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { IDiscussion } from './discussion.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICredential } from '@domain/agent';
import { DiscussionService } from './discussion.service';
import { AuthorizationCredential } from '@common/enums';
import { RoomService } from '../room/room.service';

@Injectable()
export class DiscussionAuthorizationService {
  /*
  Discussions have a fairly open authorization policy, for now.
  Any user that is a member of the community in which the Discussion takes place has the CREATE privilege.
  The CREATE privilege gives the user the right to create new discussions, as well as to post messages to the Discussion.
  */
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private discussionService: DiscussionService,
    private roomService: RoomService
  ) {}

  async applyAuthorizationPolicy(
    discussion: IDiscussion,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): Promise<IDiscussion> {
    discussion.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        discussion.authorization,
        parentAuthorization
      );

    discussion.authorization = this.extendAuthorizationPolicy(
      discussion.authorization,
      communityCredential
    );

    return await this.discussionService.save(discussion);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    communityCredential: ICredential
  ): IAuthorizationPolicy {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    // Allow any member of this community to create messages on the discussion
    const communityMember = {
      type: communityCredential.type,
      resourceID: communityCredential.resourceID,
      grantedPrivileges: [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.CREATE,
      ],
    };
    newRules.push(communityMember);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  async extendAuthorizationPolicyForMessageSender(
    discussion: IDiscussion,
    messageID: string,
    communicationUserID: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: AuthorizationPolicyRuleCredential[] = [];

    const senderUserID = await this.roomService.getUserIdForMessage(
      discussion,
      messageID,
      communicationUserID
    );

    // Allow any member of this community to create messages on the discussion
    if (senderUserID !== '') {
      const messageSender = {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: senderUserID,
        grantedPrivileges: [
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
      };
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
