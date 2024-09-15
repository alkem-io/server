import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IPost } from './post.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_POST_CREATED_BY,
  CREDENTIAL_RULE_POST_ADMINS_MOVE,
} from '@common/constants';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { CommunityRoleType } from '@common/enums/community.role';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';

@Injectable()
export class PostAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    post: IPost,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy?: ICommunityPolicy,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    if (!post.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on post reset auth:  ${post.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    post.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        post.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (post.comments) {
      let commentsAuthorization =
        this.roomAuthorizationService.applyAuthorizationPolicy(
          post.comments,
          post.authorization
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
    }

    // Extend to give the user creating the post more rights
    post.authorization = this.appendCredentialRules(
      post,
      communityPolicy,
      spaceSettings
    );
    updatedAuthorizations.push(post.authorization);

    // cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        post.profile.id,
        post.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    post: IPost,
    communityPolicy?: ICommunityPolicy,
    spaceSettings?: ISpaceSettings
  ): IAuthorizationPolicy {
    const authorization = post.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Post: ${post.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const manageCreatedPostPolicy =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.DELETE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: post.createdBy,
          },
        ],
        CREDENTIAL_RULE_POST_CREATED_BY
      );
    newRules.push(manageCreatedPostPolicy);

    // Allow space admins to move post
    const credentials: ICredentialDefinition[] = [
      {
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      },
    ];

    if (communityPolicy && spaceSettings) {
      const roleCredentials =
        this.communityPolicyService.getCredentialsForRoleWithParents(
          communityPolicy,
          spaceSettings,
          CommunityRoleType.ADMIN
        );
      credentials.push(...roleCredentials);
    }
    const adminsMovePostRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.MOVE_POST],
        credentials,
        CREDENTIAL_RULE_POST_ADMINS_MOVE
      );
    adminsMovePostRule.cascade = false;
    newRules.push(adminsMovePostRule);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
