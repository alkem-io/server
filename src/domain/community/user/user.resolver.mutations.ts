import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UserAuthorizationService } from './user.service.authorization';
import { UserSendMessageInput } from './dto/user.dto.communication.message.send';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceService } from '@domain/common/preference';
import { UpdateUserPreferenceInput } from './dto/user.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UpdateUserInput } from './dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LogContext } from '@common/enums';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPreference, {
    description: 'Updates one of the Preferences on a Space',
  })
  @Profiling.api
  async updatePreferenceOnUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('preferenceData') preferenceData: UpdateUserPreferenceInput
  ) {
    const user = await this.userService.getUserOrFail(preferenceData.userID);
    const preferenceSet = await this.userService.getPreferenceSetOrFail(
      user.id
    );
    const preference = await this.preferenceSetService.getPreferenceOrFail(
      preferenceSet,
      preferenceData.type
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `user preference update: ${preference.id}`
    );
    return await this.preferenceService.updatePreference(
      preference,
      preferenceData.value
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Sends a message on the specified User`s behalf and returns the room id',
  })
  @Profiling.api
  async messageUser(
    @Args('messageData') messageData: UserSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const receivingUser = await this.userService.getUserOrFail(
      messageData.receivingUserID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user send message: ${receivingUser.id}`
    );

    return await this.communicationAdapter.sendMessageToUser({
      senderCommunicationsID: agentInfo.communicationID,
      message: messageData.message,
      receiverCommunicationsID: receivingUser.communicationID,
    });
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Reset the Authorization policy on the specified User.',
  })
  @Profiling.api
  async authorizationPolicyResetOnUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: UserAuthorizationResetInput
  ): Promise<IUser> {
    const start = performance.now();

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
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    const elapsed = (performance.now() - start).toFixed(3);
    this.logger.verbose?.(
      `authorizationPolicyResetOnUser took ${elapsed}ms`,
      LogContext.COMMUNITY
    );
    return await this.userService.getUserOrFail(user.id);
  }

  @UseGuards(GraphqlGuard)
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
