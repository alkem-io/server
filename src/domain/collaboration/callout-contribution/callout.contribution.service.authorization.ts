import {
  CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE,
  CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY,
  CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY_DELETE,
} from '@common/constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MemoAuthorizationService } from '@domain/common/memo/memo.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Injectable } from '@nestjs/common';
import { LinkAuthorizationService } from '../link/link.service.authorization';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionService } from './callout.contribution.service';

@Injectable()
export class CalloutContributionAuthorizationService {
  constructor(
    private contributionService: CalloutContributionService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private postAuthorizationService: PostAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private linkAuthorizationService: LinkAuthorizationService,
    private memoAuthorizationService: MemoAuthorizationService,
    private platformRolesAccessService: PlatformRolesAccessService,
    private roleSetService: RoleSetService
  ) {}

  public async applyAuthorizationPolicy(
    contributionID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const contribution =
      await this.contributionService.getCalloutContributionOrFail(
        contributionID,
        {
          loadEagerRelations: false,
          relations: {
            authorization: true,
            post: {
              authorization: true,
              profile: {
                authorization: true,
              },
              comments: {
                authorization: true,
              },
            },
            whiteboard: {
              authorization: true,
              profile: {
                authorization: true,
              },
            },
            link: {
              authorization: true,
              profile: {
                authorization: true,
              },
            },
            memo: {
              authorization: true,
              profile: {
                authorization: true,
              },
            },
          },
          select: {
            id: true,
            createdBy: true,
            authorization:
              this.authorizationPolicyService.authorizationSelectOptions,
            post: {
              id: true,
              createdBy: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
              profile: {
                id: true,
              },
              comments: {
                id: true,
                authorization:
                  this.authorizationPolicyService.authorizationSelectOptions,
              },
            },
            whiteboard: {
              id: true,
            },
            link: {
              id: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
              profile: {
                id: true,
              },
            },
            memo: {
              id: true,
              authorization:
                this.authorizationPolicyService.authorizationSelectOptions,
              profile: {
                id: true,
              },
            },
          },
        }
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    contribution.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        contribution.authorization,
        parentAuthorization
      );

    // Extend to give the user creating the contribution more rights
    contribution.authorization = await this.appendCredentialRules(
      contribution,
      platformRolesAccess,
      roleSet
    );
    updatedAuthorizations.push(contribution.authorization);

    if (contribution.post) {
      const postAuthorizations =
        await this.postAuthorizationService.applyAuthorizationPolicy(
          contribution.post,
          contribution.authorization,
          platformRolesAccess,
          roleSet
        );
      updatedAuthorizations.push(...postAuthorizations);
    }
    if (contribution.whiteboard) {
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          contribution.whiteboard.id,
          contribution.authorization,
          spaceSettings
        );
      updatedAuthorizations.push(...whiteboardAuthorizations);
    }

    if (contribution.link) {
      const linkAuthorizations =
        await this.linkAuthorizationService.applyAuthorizationPolicy(
          contribution.link,
          contribution.authorization,
          contribution.createdBy
        );
      updatedAuthorizations.push(...linkAuthorizations);
    }

    if (contribution.memo) {
      const memoAuthorizations =
        await this.memoAuthorizationService.applyAuthorizationPolicy(
          contribution.memo.id,
          contribution.authorization
        );
      updatedAuthorizations.push(...memoAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    contribution: ICalloutContribution,
    platformRolesAccess: IPlatformRolesAccess,
    roleSet?: IRoleSet
  ): Promise<IAuthorizationPolicy> {
    const authorization = contribution.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Contribution: ${contribution.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (contribution.createdBy) {
      const manageContributionSettings =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: contribution.createdBy,
            },
          ],
          CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY
        );
      newRules.push(manageContributionSettings);

      const manageContributionDeletePolicy =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.DELETE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: contribution.createdBy,
            },
          ],
          CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY_DELETE
        );
      manageContributionDeletePolicy.cascade = false; // do not cascade delete to children
      newRules.push(manageContributionDeletePolicy);
    }

    // Allow space admins to move post
    const credentials: ICredentialDefinition[] = [
      {
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      },
    ];
    if (roleSet) {
      const roleSetCredentials =
        await this.roleSetService.getCredentialsForRoleWithParents(
          roleSet,
          RoleName.ADMIN
        );
      credentials.push(...roleSetCredentials);
    }
    const platformRoleCredentials =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      );
    credentials.push(...platformRoleCredentials);

    if (credentials.length > 0) {
      const adminsMoveContributionRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.MOVE_CONTRIBUTION],
          credentials,
          CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE
        );
      adminsMoveContributionRule.cascade = false;
      newRules.push(adminsMoveContributionRule);
    }

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
