import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserSettingsHomeSpaceValidationService } from '../user-settings/user.settings.home.space.validation.service';
import { UpdateUserInput } from './dto';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { UpdateUserSettingsInput } from './dto/user.dto.update.settings';
import { UserService } from './user.service';
import { UserAuthorizationService } from './user.service.authorization';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private homeSpaceValidationService: UserSettingsHomeSpaceValidationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description: 'Updates the User.',
  })
  async updateUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(userData.ID);
    // 027-platform-role-redesign (A21, FR-002/FR-003): a call that touches
    // ONLY the serviceProfile marker is Platform Roles Admin's sole-owned
    // surface and must not require the ordinary UPDATE privilege it does
    // NOT hold (FR-003: no user-record CRUD). Skip the blanket UPDATE gate
    // for that narrow call shape and defer entirely to the SET_SERVICE_PROFILE
    // check already enforced against the PLATFORM authorization policy in
    // UserService.updateUser (T052). Any input that ALSO touches another
    // field still goes through the ordinary UPDATE gate below, so this
    // cannot be used to smuggle a general user-record edit through.
    if (!this.isServiceProfileOnlyUpdate(userData)) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        user.authorization,
        AuthorizationPrivilege.UPDATE,
        `userUpdate: ${user.id}`
      );
    } else {
      // 027-platform-role-redesign (sec-server-11 fix): gate
      // SET_SERVICE_PROFILE HERE, in the resolver, before delegating to
      // UserService.updateUser. `grantAccessOrFail` throws immediately, no
      // DB write — so an unprivileged or anonymous caller (whose
      // `actorContext.actorID` is `''` for `ActorContextService.
      // createAnonymous`) is rejected WITHOUT reaching the redundant second
      // `getUserByIdOrFail` lookup in `UserService.updateUser` or its
      // fail-closed rejection-audit writer, whose INSERT previously failed
      // on an empty-string actorID and surfaced as an internal
      // `PlatformRoleAssignmentAuditException` instead of a clean
      // `ForbiddenException` — with the rejection going unrecorded either
      // way. `UserService.updateUser` keeps its OWN SET_SERVICE_PROFILE
      // check + rejection-audit write as defense in depth for any other
      // caller of that service method.
      const platformAuthorization =
        await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        platformAuthorization,
        AuthorizationPrivilege.SET_SERVICE_PROFILE,
        `updateUser serviceProfile-only: ${user.id}`
      );
    }
    return await this.userService.updateUser(userData, actorContext);
  }

  // 027-platform-role-redesign (A21): true only when the sole substantive
  // field on the input is `serviceProfile` (ID is the addressing field, not
  // a change).
  private isServiceProfileOnlyUpdate(userData: UpdateUserInput): boolean {
    return (
      userData.serviceProfile !== undefined &&
      userData.nameID === undefined &&
      userData.profileData === undefined &&
      userData.firstName === undefined &&
      userData.lastName === undefined &&
      userData.phone === undefined
    );
  }

  @Mutation(() => IUser, {
    description: 'Updates one of the Setting on a User',
  })
  async updateUserSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData') settingsData: UpdateUserSettingsInput
  ): Promise<IUser> {
    let user = await this.userService.getUserByIdOrFail(settingsData.userID, {
      relations: {
        settings: true,
      },
    });

    this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `user settings update: ${user.id}`
    );

    // Validate home space access if being set
    const homeSpaceUpdate = settingsData.settings.homeSpace;
    if (homeSpaceUpdate?.spaceID) {
      await this.homeSpaceValidationService.validateSpaceAccess(
        homeSpaceUpdate.spaceID,
        actorContext
      );
    }

    user = await this.userService.updateUserSettings(
      user,
      settingsData.settings
    );
    user = await this.userService.save(user);

    // For simplicity if a setting is updated we will reapply the authorization policy
    const updatedAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.userService.getUserByIdOrFail(user.id);
  }

  @Mutation(() => IUser, {
    description: 'Reset the Authorization policy on the specified User.',
  })
  async authorizationPolicyResetOnUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('authorizationResetData')
    authorizationResetData: UserAuthorizationResetInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(
      authorizationResetData.userID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on user: ${authorizationResetData.userID}`
    );
    const updatedAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.userService.getUserByIdOrFail(user.id);
  }

  // 027-platform-role-redesign (T078, FR-020): `updateUserPlatformSettings`
  // is GONE. Its two fields left by different doors — `nameID` to the generic
  // `updateActorNameID` (A17), and `email` deleted outright as the bug it was:
  // it wrote `user.email` directly, bypassing the Kratos identity, so a user
  // edited this way could no longer log in with the address the platform
  // showed. A login email changes only through `adminUserEmailChange` (A4),
  // which writes both sides and audits the change.
}
