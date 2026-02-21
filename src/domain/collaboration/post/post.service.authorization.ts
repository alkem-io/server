import {
  CREDENTIAL_RULE_POST_ADMINS_MOVE,
  CREDENTIAL_RULE_POST_CREATED_BY,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Injectable } from '@nestjs/common';
import { IPost } from './post.interface';

@Injectable()
export class PostAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomAuthorizationService: RoomAuthorizationService,
    private roleSetService: RoleSetService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private platformRolesAccessService: PlatformRolesAccessService
  ) {}

  async applyAuthorizationPolicy(
    post: IPost,
    parentAuthorization: IAuthorizationPolicy | undefined,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet
  ): Promise<IAuthorizationPolicy[]> {
    if (!post.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on post reset auth:  ${post.id} `,
        LogContext.COLLABORATION
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    post.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        post.authorization,
        parentAuthorization
      );

    // Inherit for comments before extending so that the creating user does not
    // have rights to delete comments
    if (post.comments) {
      let commentsAuthorization =
        await this.roomAuthorizationService.applyAuthorizationPolicy(
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
    post.authorization = await this.appendCredentialRules(
      post,
      platformRolesAccess,
      roleSet
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

  private async appendCredentialRules(
    post: IPost,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet
  ): Promise<IAuthorizationPolicy> {
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

    const credentials =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      );

    if (roleSet) {
      const roleSetCredentials =
        await this.roleSetService.getCredentialsForRoleWithParents(
          roleSet,
          RoleName.ADMIN
        );
      credentials.push(...roleSetCredentials);
    }
    if (credentials.length > 0) {
      const adminsMovePostRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.MOVE_POST],
          credentials,
          CREDENTIAL_RULE_POST_ADMINS_MOVE
        );
      adminsMovePostRule.cascade = false;
      newRules.push(adminsMovePostRule);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
