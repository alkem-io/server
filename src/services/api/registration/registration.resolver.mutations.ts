import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { DeleteUserInput, IUser } from '@domain/community/user';
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
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private userAuthorizationService: UserAuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private registrationService: RegistrationService,
    private userService: UserService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description:
      'Creates a new User profile on the platform for a user that has a valid Authentication session.',
  })
  @Profiling.api
  async createUserNewRegistration(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    const user = await this.registrationService.registerNewUser(agentInfo);
    await this.registrationService.processPendingInvitations(user);

    const updatedAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    // Send the notification
    const notificationInput: NotificationInputUserRegistered = {
      triggeredBy: agentInfo.userID,
      userID: user.id,
    };
    this.notificationAdapter.userRegistered(notificationInput);

    return user;
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
