import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { SpaceService } from '@domain/challenge/space/space.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { PlatformAuthorizationService } from '@platform/platfrom/platform.service.authorization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';

@Controller()
export class AuthResetController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private userAuthorizationService: UserAuthorizationService,
    private organizationService: OrganizationService,
    private userService: UserService
  ) {}
  @EventPattern('space-reset', Transport.RMQ)
  public async authResetSpace(
    @Payload() payload: { id: string },
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of authorization for space with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    try {
      const space = await this.spaceService.getSpaceOrFail(payload.id);
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
      this.logger.verbose?.(
        `Finished resetting authorization for space with id ${payload.id}.`,
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.verbose?.(
        `Resetting authorization for space with id ${payload.id} failed!`,
        LogContext.AUTH_POLICY
      );
      channel.nack(originalMsg);
    }
  }

  @EventPattern('platform-reset', Transport.RMQ)
  public async authResetPlatform(@Ctx() context: RmqContext) {
    this.logger.verbose?.(
      'Starting reset of authorization for platform',
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    try {
      await this.platformAuthorizationService.applyAuthorizationPolicy();
      this.logger.verbose?.(
        'Finished resetting authorization for platform.',
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.verbose?.(
        'Resetting authorization for platform failed!',
        LogContext.AUTH_POLICY
      );
      channel.nack(originalMsg);
    }
  }

  @EventPattern('user-reset', Transport.RMQ)
  public async authResetUser(
    @Payload() payload: { id: string },
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of authorization for user with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    try {
      const user = await this.userService.getUserOrFail(payload.id);
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
      this.logger.verbose?.(
        `Finished resetting authorization for user with id ${payload}.`,
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.verbose?.(
        `Resetting authorization for user with id ${payload.id} failed!`,
        LogContext.AUTH_POLICY
      );
      channel.nack(originalMsg);
    }
  }

  @EventPattern('organization-reset', Transport.RMQ)
  public async authResetOrganization(
    @Payload() payload: { id: string },
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of authorization for organization with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    try {
      const organization = await this.organizationService.getOrganizationOrFail(
        payload.id
      );
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
      this.logger.verbose?.(
        `Finished resetting authorization for organization with id ${payload.id}.`,
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.verbose?.(
        `Resetting authorization for organization with id ${payload.id} failed!`,
        LogContext.AUTH_POLICY
      );
      channel.nack(originalMsg);
    }
  }
}
