import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleChangeType } from '@alkemio/notifications-lib';
import { IUser } from '@domain/community/user/user.interface';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.global.role.change';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { RoleName } from '@common/enums/role.name';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { RemovePlatformRoleInput } from './dto/platform.role.dto.remove';
import { AssignPlatformRoleInput } from './dto/platform.role.dto.assign';
import { PlatformService } from '@platform/platform/platform.service';

@Resolver()
export class PlatformRoleResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountLookupService: AccountLookupService,
    private accountLicenseService: AccountLicenseService,
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private licenseService: LicenseService,
    private agentService: AgentService,
    private roleSetService: RoleSetService,
    private userLookupService: UserLookupService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private platformService: PlatformService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User to a role on the Platform.',
  })
  async assignPlatformRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignPlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();

    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;

    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      agentInfo,
      true
    );

    const user = await this.userLookupService.getUserOrFail(
      roleData.contributorID
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also assign the user account a license plan
      const accountAgent = await this.accountLookupService.getAgent(
        user.accountID
      );

      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.agentService.grantCredential({
        agentID: accountAgent.id,
        ...accountLicenseCredential,
      });
      await this.resetLicenseForUserAccount(user);
    }

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from a Role on the Platform.',
  })
  async removePlatformRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemovePlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();

    let privilegeRequired = AuthorizationPrivilege.GRANT;
    let extendedAuthorization = roleSet.authorization;

    privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      privilegeRequired = AuthorizationPrivilege.GRANT;
      // Extend the authorization policy with a credential rule to assign the GRANT privilege
      // to the user specified in the incoming mutation. Then if it is the same user as is logged
      // in then the user will have the GRANT privilege + so can carry out the mutation
      extendedAuthorization =
        this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
          roleSet,
          roleData.contributorID
        );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      privilegeRequired,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );

    await this.roleSetService.removeUserFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );

    const user = await this.userLookupService.getUserOrFail(
      roleData.contributorID
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also remoove the user account a license plan
      const accountAgent = await this.accountLookupService.getAgent(
        user.accountID
      );
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.agentService.revokeCredential({
        agentID: accountAgent.id,
        ...accountLicenseCredential,
      });

      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.REMOVED,
      roleData.role
    );

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  private async resetLicenseForUserAccount(user: IUser) {
    const account = await this.accountService.getAccountOrFail(user.accountID);
    const licenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(licenses);
  }

  private async notifyPlatformGlobalRoleChange(
    triggeredBy: string,
    user: IUser,
    type: RoleChangeType,
    role: string
  ) {
    const notificationInput: NotificationInputPlatformGlobalRoleChange = {
      triggeredBy,
      userID: user.id,
      type: type,
      role: role,
    };
    await this.notificationAdapter.platformGlobalRoleChanged(notificationInput);
  }
}
