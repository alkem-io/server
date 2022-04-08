import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AgentInfo } from '@core/authentication';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { RegistrationService } from './registration.service';

@Resolver()
export class RegistrationResolverMutations {
  constructor(
    private userAuthorizationService: UserAuthorizationService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    private registrationService: RegistrationService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy,
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

    const payload =
      await this.notificationsPayloadBuilder.buildUserRegisteredNotificationPayload(
        user.id
      );

    this.notificationsClient.emit<number>(EventType.USER_REGISTERED, payload);

    return savedUser;
  }
}
