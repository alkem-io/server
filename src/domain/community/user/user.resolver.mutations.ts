import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserSettingsHomeSpaceValidationService } from '../user-settings/user.settings.home.space.validation.service';
import { UpdateUserInput } from './dto';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UpdateUserSettingsInput } from './dto/user.dto.update.settings';
import { UserService } from './user.service';
import { UserAuthorizationService } from './user.service.authorization';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
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

  @Mutation(() => IUser, {
    description:
      'Update the platform settings, such as nameID, email, for the specified User.',
  })
  async updateUserPlatformSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateUserPlatformSettingsInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(updateData.userID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on User: ${user.id}`
    );

    return await this.userService.updateUserPlatformSettings(updateData);
  }
}
