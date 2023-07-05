import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IPost } from './post.interface';
import { Post } from './post.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { PostService } from './post.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_POST_CREATED_BY,
  CREDENTIAL_RULE_POST_ADMINS_MOVE,
} from '@common/constants';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { CommunityRole } from '@common/enums/community.role';

@Injectable()
export class PostAuthorizationService {
  constructor(
    private postService: PostService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>
  ) {}

  async applyAuthorizationPolicy(
    post: IPost,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
  ): Promise<IPost> {
    post.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        post.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (post.comments) {
      post.comments =
        await this.roomAuthorizationService.applyAuthorizationPolicy(
          post.comments,
          post.authorization
        );

      post.comments.authorization =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          post.comments.authorization
        );
      post.comments.authorization =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          post.comments.authorization
        );
    }

    // Extend to give the user creating the post more rights
    post.authorization = this.appendCredentialRules(post, communityPolicy);

    // cascade
    post.profile = await this.postService.getProfile(post);
    post.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        post.profile,
        post.authorization
      );

    return await this.postRepository.save(post);
  }

  private appendCredentialRules(
    post: IPost,
    communityPolicy: ICommunityPolicy
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
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
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
    const credentials = this.communityPolicyService.getAllCredentialsForRole(
      communityPolicy,
      CommunityRole.ADMIN
    );
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    credentials.push({
      type: AuthorizationCredential.GLOBAL_ADMIN_SPACES,
      resourceID: '',
    });
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
