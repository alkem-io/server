import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UserAuthorizationService } from './user.service.authorization';
import { UserSendMessageInput } from './dto/user.dto.communication.message.send';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UpdateUserInput } from './dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateUserSettingsInput } from './dto/user.dto.update.settings';
import { InstrumentResolver } from '@src/apm/decorators';
import { LogContext } from '@common/enums';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private communicationAdapter: CommunicationAdapter,
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
      relations: {
        settings: true,
      },
    });

    this.authorizationService.grantAccessOrFail(
      agentInfo,
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

    return this.userService.getUserOrFail(user.id);
  }

  @Mutation(() => String, {
    description:
      'Sends a message on the specified User`s behalf and returns the room id',
  })
  async messageUser(
    @Args('messageData') messageData: UserSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const receivingUser = await this.userService.getUserOrFail(
      messageData.receivingUserID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user send message: ${receivingUser.id}`
    );

    // Check if the user is willing to receive messages
    if (!receivingUser.settings.communication.allowOtherUsersToSendMessages) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.USER,
        {
          userId: receivingUser.id,
          senderId: agentInfo.userID,
        }
      );
    }

    return await this.communicationAdapter.sendMessageToUser({
      senderCommunicationsID: agentInfo.communicationID,
      message: messageData.message,
      receiverCommunicationsID: receivingUser.communicationID,
    });
  }

  @Mutation(() => IUser, {
    description: 'Reset the Authorization policy on the specified User.',
  })
  @Profiling.api
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
