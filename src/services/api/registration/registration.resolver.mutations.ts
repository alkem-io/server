import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { RegistrationService } from './registration.service';
import { NotificationInputUserRegistered } from '@services/adapters/notification-adapter/dto/notification.dto.input.user.registered';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';

@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private userAuthorizationService: UserAuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private registrationService: RegistrationService,
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

    const savedUser =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);

    await this.registrationService.processPendingInvitations(user);

    // Send the notification
    const notificationInput: NotificationInputUserRegistered = {
      triggeredBy: agentInfo.userID,
      userID: savedUser.id,
    };
    await this.notificationAdapter.userRegistered(notificationInput);

    return savedUser;
  }
}
