import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CommunityRoleType } from '@common/enums/community.role';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import {
  CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE,
  CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY,
  CREDENTIAL_RULE_CONTRIBUTION_CREATED_BY_DELETE,
} from '@common/constants';
import { LinkAuthorizationService } from '../link/link.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IRoleManager } from '@domain/access/role-manager/role.manager.interface';
import { RoleManagerService } from '@domain/access/role-manager/role.manager.service';

@Injectable()
export class CalloutContributionAuthorizationService {
  constructor(
    private contributionService: CalloutContributionService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private postAuthorizationService: PostAuthorizationService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private linkAuthorizationService: LinkAuthorizationService,
    private roleManagerService: RoleManagerService
  ) {}

  public async applyAuthorizationPolicy(
    contributionID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    roleManager?: IRoleManager,
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
    contribution.authorization = this.appendCredentialRules(
      contribution,
      roleManager,
      spaceSettings
    );
    updatedAuthorizations.push(contribution.authorization);

    if (contribution.post) {
      const postAuthorizations =
        await this.postAuthorizationService.applyAuthorizationPolicy(
          contribution.post,
          contribution.authorization,
          roleManager,
          spaceSettings
        );
      updatedAuthorizations.push(...postAuthorizations);
    }
    if (contribution.whiteboard) {
      const whiteboardAuthorizations =
        await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
          contribution.whiteboard.id,
          contribution.authorization
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

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    contribution: ICalloutContribution,
    communityPolicy?: IRoleManager,
    spaceSettings?: ISpaceSettings
  ): IAuthorizationPolicy {
    const authorization = contribution.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Contribution: ${contribution.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (contribution.createdBy) {
      const manageContributionPolicy =
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
      newRules.push(manageContributionPolicy);

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
    if (communityPolicy && spaceSettings) {
      const roleCredentials =
        this.roleManagerService.getCredentialsForRoleWithParents(
          communityPolicy,
          CommunityRoleType.ADMIN,
          spaceSettings
        );
      credentials.push(...roleCredentials);
    }
    const adminsMoveContributionRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.MOVE_CONTRIBUTION],
        credentials,
        CREDENTIAL_RULE_CONTRIBUTION_ADMINS_MOVE
      );
    adminsMoveContributionRule.cascade = false;
    newRules.push(adminsMoveContributionRule);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
