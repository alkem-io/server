import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context';
import { UserAuthorizationService } from './user.service.authorization';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UpdateUserInput } from './dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateUserSettingsInput } from './dto/user.dto.update.settings';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
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
    this.authorizationService.grantAccessOrFail(
      actorContext,
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
      actorContext,
      user.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on User: ${user.id}`
    );

    return await this.userService.updateUserPlatformSettings(updateData);
  }
}
