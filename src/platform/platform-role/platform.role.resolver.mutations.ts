import { RoleChangeType } from '@alkemio/notifications-lib';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { AssignPlatformRoleInput } from './dto/platform.role.dto.assign';
import { RemovePlatformRoleInput } from './dto/platform.role.dto.remove';

@InstrumentResolver()
@Resolver()
export class PlatformRoleResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountLookupService: AccountLookupService,
    private accountLicenseService: AccountLicenseService,
    private authorizationService: AuthorizationService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private licenseService: LicenseService,
    private actorService: ActorService,
    private roleSetService: RoleSetService,
    private userLookupService: UserLookupService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private platformService: PlatformService
  ) {}

  @Mutation(() => IUser, {
    description: 'Assigns a User to a role on the Platform.',
  })
  async assignPlatformRoleToUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: AssignPlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();

    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;

    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      privilegeRequired = AuthorizationPrivilege.GRANT;
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );

    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      actorContext,
      true
    );

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorId
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also assign the user account a license plan
      // Account IS the Actor - use accountID directly as actorId
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.actorService.grantCredentialOrFail(
        user.accountID,
        accountLicenseCredential
      );
      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      actorContext.actorId,
      user,
      RoleChangeType.ADDED,
      roleData.role
    );

    return await this.userLookupService.getUserByIdOrFail(roleData.actorId);
  }

  @Mutation(() => IUser, {
    description: 'Removes a User from a Role on the Platform.',
  })
  async removePlatformRoleFromUser(
    @CurrentActor() actorContext: ActorContext,
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
          roleData.actorId
        );
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      privilegeRequired,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorId
    );

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorId
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
    ) {
      // Also remove the user account a license plan
      // Account IS the Actor - use accountID directly as actorId
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.actorService.revokeCredential(
        user.accountID,
        accountLicenseCredential
      );

      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      actorContext.actorId,
      user,
      RoleChangeType.REMOVED,
      roleData.role
    );

    return await this.userLookupService.getUserByIdOrFail(roleData.actorId);
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
    await this.notificationPlatformAdapter.platformGlobalRoleChanged(
      notificationInput
    );
  }
}
