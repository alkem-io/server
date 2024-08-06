import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { RegistrationService } from './registration.service';
import { NotificationInputUserRegistered } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.registered';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { UserService } from '@domain/community/user/user.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { NotificationInputUserRemoved } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.removed';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { CreateUserInput } from '@domain/community/user/dto/user.dto.create';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';

@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private userAuthorizationService: UserAuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private registrationService: RegistrationService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Creates a new User profile on the platform for a user that has a valid Authentication session.',
  })
  async createUserNewRegistration(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    let user = await this.registrationService.registerNewUser(agentInfo);

    user = await this.userAuthorizationService.applyAuthorizationPolicy(user);

    await this.registrationService.processPendingInvitations(user);

    await this.userCreatedEvents(user, agentInfo);

    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  async createUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${agentInfo.email}`
    );
    let user = await this.userService.createUser(userData);
    user = await this.userAuthorizationService.grantCredentials(user);

    const savedUser =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);

    await this.registrationService.processPendingInvitations(user);

    await this.userCreatedEvents(savedUser, agentInfo);

    return savedUser;
  }
  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Creates a new Organization on the platform.',
  })
  @Profiling.api
  async createOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organizationData') organizationData: CreateOrganizationInput
  ): Promise<IOrganization> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Organization: ${organizationData.nameID}`
    );
    const organization = await this.organizationService.createOrganization(
      organizationData,
      agentInfo
    );

    return await this.organizationAuthorizationService.applyAuthorizationPolicy(
      organization
    );
  }

  private async userCreatedEvents(user: IUser, agentInfo: AgentInfo) {
    // Send the notification
    const notificationInput: NotificationInputUserRegistered = {
      triggeredBy: agentInfo.userID,
      userID: user.id,
    };
    await this.notificationAdapter.userRegistered(notificationInput);
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
      relations: { profile: true },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.id}`
    );
    const userDeleted =
      await this.registrationService.deleteUserWithPendingMemberships(
        deleteData
      );
    // Send the notification
    const notificationInput: NotificationInputUserRemoved = {
      triggeredBy: agentInfo.userID,
      user,
    };
    await this.notificationAdapter.userRemoved(notificationInput);
    return userDeleted;
  }
}
