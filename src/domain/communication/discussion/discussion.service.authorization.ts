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
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { CommunicationDiscussionPrivacy } from '@common/enums/communication.discussion.privacy';

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
    discussionInput: IDiscussion,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      discussionInput.id,
      {
        relations: {
          profile: true,
          comments: true,
        },
      }
    );
    if (!discussion.profile || !discussion.comments) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for Discussion ${discussion.id} `,
        LogContext.COMMUNICATION
      );
    }
    discussion.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        discussion.authorization,
        parentAuthorization
      );

    discussion.authorization = this.extendAuthorizationPolicy(
      discussion.authorization
    );
    // Clone the authorization policy so can control what children get what setting
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        discussion.authorization
      );
    switch (discussion.privacy) {
      case CommunicationDiscussionPrivacy.PUBLIC:
        // To ensure that the discussion + discussion profile is visible for non-authenticated users
        discussion.authorization.anonymousReadAccess = true;
        break;
      case CommunicationDiscussionPrivacy.AUTHENTICATED:
        break;
      case CommunicationDiscussionPrivacy.AUTHOR:
        // This actually requires a NOT in the authorization framework; for later
        break;
    }

    discussion.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        discussion.profile,
        discussion.authorization
      );

    discussion.comments =
      await this.roomAuthorizationService.applyAuthorizationPolicy(
        discussion.comments,
        clonedAuthorization
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
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
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
