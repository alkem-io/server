import { CREDENTIAL_RULE_TYPES_UPDATE_FORUM_DISCUSSION } from '@common/constants/authorization/credential.rule.types.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForumDiscussionPrivacy } from '@common/enums/forum.discussion.privacy';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { RoomAuthorizationService } from '../../domain/communication/room/room.service.authorization';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';

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
  ): Promise<IAuthorizationPolicy[]> {
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
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    discussion.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        discussion.authorization,
        parentAuthorization
      );
    discussion.authorization = this.extendAuthorizationPolicy(
      discussion.authorization
    );
    updatedAuthorizations.push(discussion.authorization);

    // Clone the authorization policy so can control what children get what setting
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        discussion.authorization
      );
    switch (discussion.privacy) {
      case ForumDiscussionPrivacy.PUBLIC:
        // To ensure that the discussion + discussion profile is visible for non-authenticated users
        discussion.authorization =
          this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
            discussion.authorization,
            AuthorizationPrivilege.READ
          );
        break;
      case ForumDiscussionPrivacy.AUTHENTICATED:
        break;
      case ForumDiscussionPrivacy.AUTHOR:
        // This actually requires a NOT in the authorization framework; for later
        break;
    }

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        discussion.profile.id,
        discussion.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    let commentsAuthorization =
      this.roomAuthorizationService.applyAuthorizationPolicy(
        discussion.comments,
        clonedAuthorization
      );
    commentsAuthorization =
      this.roomAuthorizationService.allowContributorsToCreateMessages(
        commentsAuthorization
      );
    commentsAuthorization =
      this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
        commentsAuthorization
      );
    updatedAuthorizations.push(commentsAuthorization);

    return updatedAuthorizations;
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
