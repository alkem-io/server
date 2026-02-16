import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(userData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `userUpdate: ${user.id}`
    );
    return await this.userService.updateUser(userData);
  }

  @Mutation(() => IUser, {
    description: 'Updates one of the Setting on a User',
  })
  async updateUserSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdateUserSettingsInput
  ): Promise<IUser> {
    let user = await this.userService.getUserOrFail(settingsData.userID, {
      with: {
        settings: true,
      },
    });

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `user settings update: ${user.id}`
    );

    // Validate home space access if being set
    const homeSpaceUpdate = settingsData.settings.homeSpace;
    if (homeSpaceUpdate?.spaceID) {
      await this.homeSpaceValidationService.validateSpaceAccess(
        homeSpaceUpdate.spaceID,
        agentInfo
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

    return this.userService.getUserOrFail(user.id);
  }

  @Mutation(() => IUser, {
    description: 'Reset the Authorization policy on the specified User.',
  })
  async authorizationPolicyResetOnUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: UserAuthorizationResetInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(
      authorizationResetData.userID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on user: ${authorizationResetData.userID}`
    );
    const updatedAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.userService.getUserOrFail(user.id);
  }

  @Mutation(() => IUser, {
    description:
      'Update the platform settings, such as nameID, email, for the specified User.',
  })
  async updateUserPlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateUserPlatformSettingsInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(updateData.userID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on User: ${user.id}`
    );

    return await this.userService.updateUserPlatformSettings(updateData);
  }
}
