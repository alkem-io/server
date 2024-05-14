import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CREDENTIAL_RULE_TYPES_UPDATE_FORUM_DISCUSSION } from '@common/constants/authorization/credential.rule.types.constants';

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
    private profileAuthorizationService: ProfileAuthorizationService,
    private roomAuthorizationService: RoomAuthorizationService
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

    discussion.profile = await this.discussionService.getProfile(discussion);
    discussion.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        discussion.profile,
        discussion.authorization
      );

    discussion.comments = await this.discussionService.getComments(
      discussion.id
    );
    discussion.comments =
      await this.roomAuthorizationService.applyAuthorizationPolicy(
        discussion.comments,
        discussion.authorization
      );
    discussion.comments.authorization =
      this.roomAuthorizationService.allowContributorsToCreateMessages(
        discussion.comments.authorization
      );
    discussion.comments.authorization =
      this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
        discussion.comments.authorization
      );

    return await this.discussionService.save(discussion);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to update Discussions
    const platformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_UPDATE_FORUM_DISCUSSION
      );
    platformAdmin.cascade = false;
    newRules.push(platformAdmin);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
