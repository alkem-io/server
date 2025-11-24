import { Injectable, Inject, LoggerService } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_WHITEBOARD_CREATED_BY,
  POLICY_RULE_WHITEBOARD_CONTENT_UPDATE,
  POLICY_RULE_WHITEBOARD_GRANT_PUBLIC_SHARE,
} from '@common/constants';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { IWhiteboard } from './whiteboard.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { WhiteboardService } from './whiteboard.service';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoleName } from '@common/enums/role.name';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';

const CREDENTIAL_RULE_WHITEBOARD_OWNER_PUBLIC_SHARE =
  'whiteboard-owner-public-share';
const CREDENTIAL_RULE_SPACE_ADMIN_PUBLIC_SHARE = 'space-admin-public-share';

@Injectable()
export class WhiteboardAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private whiteboardService: WhiteboardService,
    private roleSetService: RoleSetService,
    private communityResolverService: CommunityResolverService,
    private whiteboardGuestAccessService: WhiteboardGuestAccessService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy[]> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardID,
      {
        loadEagerRelations: false,
        relations: {
          authorization: true,
          profile: {
            authorization: true,
          },
        },
        select: {
          id: true,
          createdBy: true,
          contentUpdatePolicy: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
          profile: {
            id: true,
          },
        },
      }
    );
    if (!whiteboard.profile) {
      throw new RelationshipNotFoundException(
        'Unable to load Profile on Whiteboard auth reset',
        LogContext.COLLABORATION,
        { whiteboardID }
      );
    }
    const wasGuestAccessEnabledBeforeReset =
      this.whiteboardGuestAccessService.isGuestAccessEnabled(
        whiteboard.authorization
      );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    whiteboard.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboard.authorization,
        parentAuthorization
      );

    whiteboard.authorization = await this.appendCredentialRules(
      whiteboard,
      wasGuestAccessEnabledBeforeReset,
      spaceSettings
    );
    whiteboard.authorization = this.appendPrivilegeRules(
      whiteboard.authorization,
      whiteboard,
      spaceSettings
    );
    updatedAuthorizations.push(whiteboard.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboard.profile.id,
        whiteboard.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    whiteboard: IWhiteboard,
    enabledGuestAccess: boolean,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    const authorization = whiteboard.authorization;
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for Whiteboard: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (whiteboard.createdBy) {
      const manageWhiteboardCreatedByPolicy =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.UPDATE_CONTENT,
            AuthorizationPrivilege.CONTRIBUTE,
            AuthorizationPrivilege.DELETE,
          ],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: whiteboard.createdBy,
            },
          ],
          CREDENTIAL_RULE_WHITEBOARD_CREATED_BY
        );
      newRules.push(manageWhiteboardCreatedByPolicy);
    }

    await this.appendSettingsDrivenCredentialRules(
      whiteboard,
      newRules,
      spaceSettings
    );

    if (
      enabledGuestAccess &&
      spaceSettings?.collaboration?.allowGuestContributions
    ) {
      newRules.push(
        this.whiteboardGuestAccessService.getGuestAccessCredentialRule()
      );
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private async appendSettingsDrivenCredentialRules(
    whiteboard: IWhiteboard,
    newRules: IAuthorizationPolicyRuleCredential[],
    spaceSettings?: ISpaceSettings
  ): Promise<void> {
    if (!spaceSettings) {
      return;
    }

    if (!spaceSettings.collaboration?.allowGuestContributions) {
      this.logger.verbose?.(
        `Skipping admin PUBLIC_SHARE credential rule for whiteboard ${whiteboard.id} - guest contributions disabled`,
        LogContext.COLLABORATION
      );
      return;
    }

    if (whiteboard.createdBy) {
      // T007: Add PUBLIC_SHARE credential rule for whiteboard owner when guest contributions enabled
      const ownerPublicSharePolicy =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.PUBLIC_SHARE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: whiteboard.createdBy,
            },
          ],
          CREDENTIAL_RULE_WHITEBOARD_OWNER_PUBLIC_SHARE
        );
      newRules.push(ownerPublicSharePolicy);

      // T011: Structured logging for owner PUBLIC_SHARE privilege assignment
      this.logger.verbose?.(
        'Granting PUBLIC_SHARE privilege to whiteboard owner',
        {
          whiteboardId: whiteboard.id,
          userId: whiteboard.createdBy,
          context: LogContext.COLLABORATION,
        }
      );
    }

    const adminCredentialDefinitions =
      await this.resolveAdminCredentialsWithParentsDefinitions(whiteboard.id);

    if (adminCredentialDefinitions.length === 0) {
      this.logger.verbose?.(
        `No admin credential holders resolved for whiteboard ${whiteboard.id}; skipping PUBLIC_SHARE admin rule`,
        LogContext.COLLABORATION
      );
      return;
    }

    const adminPublicSharePolicy =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.PUBLIC_SHARE],
        adminCredentialDefinitions,
        CREDENTIAL_RULE_SPACE_ADMIN_PUBLIC_SHARE
      );
    newRules.push(adminPublicSharePolicy);

    this.logger.verbose?.(
      'Granting PUBLIC_SHARE privilege to admin credential holders',
      {
        whiteboardId: whiteboard.id,
        credentialCount: adminCredentialDefinitions.length,
        context: LogContext.COLLABORATION,
      }
    );
  }

  private async resolveAdminCredentialsWithParentsDefinitions(
    whiteboardId: string
  ): Promise<ICredentialDefinition[]> {
    const credentialDefinitions: ICredentialDefinition[] = [];
    try {
      // whiteboard community
      const community =
        await this.communityResolverService.getCommunityFromWhiteboardOrFail(
          whiteboardId
        );

      const whiteboardCommunityRoleSet = community.roleSet;

      // space of whiteboard community
      const space =
        await this.communityResolverService.getSpaceForCommunityOrFail(
          community.id
        );

      const spaceCommunityRoleSet = space.community?.roleSet;

      if (whiteboardCommunityRoleSet) {
        // Get admin credentials for the whiteboard community and its parents
        const spaceAdminCredentials =
          await this.roleSetService.getCredentialsForRoleWithParents(
            whiteboardCommunityRoleSet,
            RoleName.ADMIN
          );
        credentialDefinitions.push(...spaceAdminCredentials);
      } else {
        credentialDefinitions.push({
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: space.id,
        });

        if (spaceCommunityRoleSet) {
          // Get admin credentials for the space community and its parents
          const fallbackAdminCredentials =
            await this.roleSetService.getCredentialsForRoleWithParents(
              spaceCommunityRoleSet,
              RoleName.ADMIN
            );
          credentialDefinitions.push(...fallbackAdminCredentials);
        }
      }

      return credentialDefinitions;
    } catch (error) {
      this.logger.debug?.(
        'Failed to resolve admin credential definitions for PUBLIC_SHARE',
        {
          whiteboardId,
          error: error instanceof Error ? error.message : error,
          context: LogContext.COLLABORATION,
        }
      );
      return [];
    }
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy,
    whiteboard: IWhiteboard,
    spaceSettings?: ISpaceSettings
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    switch (whiteboard.contentUpdatePolicy) {
      case ContentUpdatePolicy.OWNER:
        break; // covered via dedicated rule above
      case ContentUpdatePolicy.ADMINS: {
        const updateContentPrivilegeAdmins =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.UPDATE,
            POLICY_RULE_WHITEBOARD_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeAdmins);
        break;
      }
      case ContentUpdatePolicy.CONTRIBUTORS: {
        const updateContentPrivilegeContributors =
          new AuthorizationPolicyRulePrivilege(
            [AuthorizationPrivilege.UPDATE_CONTENT],
            AuthorizationPrivilege.CONTRIBUTE,
            POLICY_RULE_WHITEBOARD_CONTENT_UPDATE
          );
        privilegeRules.push(updateContentPrivilegeContributors);
        break;
      }
    }

    if (!!spaceSettings?.collaboration?.allowGuestContributions) {
      // Guest contributions rely on global admins surfacing with GRANT;
      // this privilege rule exists so those GRANT-only actors inherit PUBLIC_SHARE automatically.
      // (Global Support remains wired through getAccessPrivilegesForSupport until we make it more robust.)
      const grantToPublicShareRule = new AuthorizationPolicyRulePrivilege(
        [AuthorizationPrivilege.PUBLIC_SHARE],
        AuthorizationPrivilege.GRANT,
        POLICY_RULE_WHITEBOARD_GRANT_PUBLIC_SHARE
      );

      privilegeRules.push(grantToPublicShareRule);
    }

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
