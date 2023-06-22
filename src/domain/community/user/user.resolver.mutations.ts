import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateUserInput,
  DeleteUserInput,
  IUser,
  UpdateUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { UserAuthorizationService } from './user.service.authorization';
import { UserSendMessageInput } from './dto/user.dto.communication.message.send';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceService } from '@domain/common/preference';
import { UpdateUserPreferenceInput } from './dto/user.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { NotificationInputUserRegistered } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.registered';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputUserRemoved } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.removed';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${agentInfo.email}`
    );
    let user = await this.userService.createUser(userData);
    user = await this.userAuthorizationService.grantCredentials(user);

    const savedUser =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);

    // Send the notification
    const notificationInput: NotificationInputUserRegistered = {
      triggeredBy: agentInfo.userID,
      userID: savedUser.id,
    };
    await this.notificationAdapter.userRegistered(notificationInput);

    return savedUser;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Updates the User.',
  })
  @Profiling.api
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
  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(deleteData.ID, {
      relations: ['profile'],
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.id}`
    );
    const userDeleted = await this.userService.deleteUser(deleteData);
    // Send the notification
    const notificationInput: NotificationInputUserRemoved = {
      triggeredBy: agentInfo.userID,
      user,
    };
    await this.notificationAdapter.userRemoved(notificationInput);
    return userDeleted;
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
    const user = await this.userService.getUserOrFail(
      authorizationResetData.userID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization definition on user: ${authorizationResetData.userID}`
    );
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }
}
