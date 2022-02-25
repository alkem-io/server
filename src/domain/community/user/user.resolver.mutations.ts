import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { UserAuthorizationService } from './user.service.authorization';
import { UserSendMessageInput } from './dto/user.dto.communication.message.send';
import { UserAuthorizationResetInput } from './dto/user.dto.reset.authorization';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { IUserPreference, UserPreferenceService } from '../user-preferences';
import { UpdateUserPreferenceInput } from '../user-preferences/dto';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  BeginCredentialOfferOutput,
  BeginCredentialRequestOutput,
} from '@domain/agent/credential/credential.dto.interactions';
import { AuthenticationException } from '@common/exceptions/authentication.exception';
import { ssiConfig } from '@config/ssi.config';
import { ConfigurationTypes } from '@common/enums';
import { v4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AlkemioUserClaim } from '@services/platform/trust-registry-adapter/claim/claim.entity';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private readonly communicationAdapter: CommunicationAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private readonly userService: UserService,
    private readonly userAuthorizationService: UserAuthorizationService,
    private readonly preferenceService: UserPreferenceService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    private configService: ConfigService,
    private agentService: AgentService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
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
      this.authorizationPolicyService.getPlatformAuthorizationPolicy();
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

    const payload =
      await this.notificationsPayloadBuilder.buildUserRegisteredNotificationPayload(
        user.id
      );

    this.notificationsClient.emit<number>(EventType.USER_REGISTERED, payload);

    return savedUser;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Creates a new User profile on the platform for a user that has a valid Authentication session.',
  })
  @Profiling.api
  async createUserNewRegistration(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    // If a user has a valid session, and hence email / names etc set, then they can create a User profile
    let user = await this.userService.createUserFromAgentInfo(agentInfo);
    user = await this.userAuthorizationService.grantCredentials(user);

    const savedUser =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);

    const payload =
      await this.notificationsPayloadBuilder.buildUserRegisteredNotificationPayload(
        user.id
      );

    this.notificationsClient.emit<number>(EventType.USER_REGISTERED, payload);
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
      `userUpdate: ${user.nameID}`
    );
    return await this.userService.updateUser(userData);
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
    const user = await this.userService.getUserOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.nameID}`
    );
    return await this.userService.deleteUser(deleteData);
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
      `user send message: ${receivingUser.nameID}`
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
      AuthorizationPrivilege.UPDATE,
      `reset authorization definition on user: ${authorizationResetData.userID}`
    );
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserPreference, {
    description: 'Updates an user preference',
  })
  @Profiling.api
  async updateUserPreference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userPreferenceData') userPreferenceData: UpdateUserPreferenceInput
  ) {
    const user = await this.userService.getUserOrFail(
      userPreferenceData.userID
    );

    const preference = await this.preferenceService.getUserPreferenceOrFail(
      user,
      userPreferenceData.type
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `user preference update: ${preference.id}`
    );
    return await this.preferenceService.updateUserPreference(
      user,
      userPreferenceData.type,
      userPreferenceData.value
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => BeginCredentialRequestOutput, {
    nullable: false,
    description: 'Generate credential share request',
  })
  @Profiling.api
  async beginCredentialRequestInteraction(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'types', type: () => [String] }) types: string[]
  ): Promise<BeginCredentialRequestOutput> {
    const userID = agentInfo.userID;
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    // TODO - the api/public/rest needs to be configurable
    const nonce = v4();
    const url = `${
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint
    }/api/public/rest/${
      ssiConfig.endpoints.completeCredentialRequestInteraction
    }/${nonce}`;

    const storedAgent = await this.userService.getAgent(userID);
    return await this.agentService.beginCredentialRequestInteraction(
      storedAgent,
      url,
      nonce,
      types
    );
  }

  private generateCredentialOfferUrl() {
    // TODO - the api/public/rest needs to be configurable
    const nonce = v4();
    const url = `${
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint
    }/api/public/rest/${
      ssiConfig.endpoints.completeCredentialOfferInteraction
    }/${nonce}`;

    return {
      nonce,
      url,
    };
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => BeginCredentialOfferOutput, {
    description: 'Generate Alkemio user credential offer',
  })
  @Profiling.api
  async beginAlkemioUserCredentialOfferInteraction(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<BeginCredentialOfferOutput> {
    const userID = agentInfo.userID;
    // TODO need to verify that the user has verified registration
    if (!userID || userID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated user; no identifier'
      );
    }

    const { nonce, url } = this.generateCredentialOfferUrl();

    const storedAgent = await this.userService.getAgent(userID);
    return await this.agentService.beginCredentialOfferInteraction(
      storedAgent,
      url,
      nonce,
      [
        {
          type: 'AlkemioMemberCredential',
          claims: [new AlkemioUserClaim({ userID, email: agentInfo.email })],
        },
      ]
    );
  }
}
