import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Repository } from 'typeorm';
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
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceService } from '@domain/common/preference';
import { UpdateUserPreferenceInput } from './dto/user.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@src/domain';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';
import { AuthorizationCredential } from '@src/common';
import { AgentService } from '@domain/agent/agent/agent.service';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private agentService: AgentService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService,
    // todo: refactor to not reference organization
    // repository is used to avoid circular dependency between org and user
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
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

    await this.assignUserToOrganizationByDomain(agentInfo, savedUser);

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
  @Mutation(() => IPreference, {
    description: 'Updates one of the Preferences on a Hub',
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

  private async assignUserToOrganizationByDomain(
    agentInfo: AgentInfo,
    user: IUser
  ): Promise<void> {
    if (!agentInfo.emailVerified) {
      return;
    }

    const userEmailDomain = user.email.split('@')[1];
    // todo refactor to not use repository directly
    const org = await this.organizationRepository.findOne(
      { domain: userEmailDomain },
      { relations: ['preferenceSet', 'verification'] }
    );

    if (
      !org ||
      org.verification.status !==
        OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION ||
      !org.preferenceSet
    ) {
      return;
    }

    const orgMatchDomain =
      this.preferenceSetService.getPreferenceOrFail(
        org.preferenceSet,
        OrganizationPreferenceType.AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN
      ).value === 'true';

    if (!orgMatchDomain) {
      return;
    }

    const { agent } = await this.userService.getUserAndAgent(user.id);

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_MEMBER,
      resourceID: org.id,
    });
  }
}
