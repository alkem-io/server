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
import { LogContext, MessagingQueue } from '@common/enums';
import { PlatformAuthorizationService } from '@platform/platfrom/platform.service.authorization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
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
  @EventPattern('test-reset', Transport.RMQ)
  public testReset(
    @Payload() payload: { id: string },
    @Ctx() context: RmqContext
  ) {
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers[RETRY_HEADER] ?? 0;

    try {
      if (Math.random() < 0.7) {
        throw new Error('Processing failed');
      }

      console.log(
        'Processing succeeded',
        retryCount
          ? `after ${retryCount} retr${retryCount > 1 ? 'ies' : 'y'}`
          : ''
      );

      channel.ack(originalMsg); // Acknowledge the message
    } catch (e) {
      if (retryCount >= MAX_RETRIES) {
        console.error('Max retries reached. Rejecting message');
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        console.warn(
          `Processing failed. Retrying (${retryCount + 1}/${MAX_RETRIES})`
        );
        channel.publish('', 'auth-reset', originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
    }
  }

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

    const retryCount = originalMsg.properties.headers[RETRY_HEADER] ?? 0;

    try {
      const space = await this.spaceService.getSpaceOrFail(payload.id);
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
      this.logger.verbose?.(
        `Finished resetting authorization for space with id ${payload.id}.`,
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          `Resetting authorization for space with id ${payload.id} failed! Max retries reached. Rejecting message.`,
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for space with id ${
            payload.id
          } failed. Retrying (${retryCount + 1}/${MAX_RETRIES})`,
          LogContext.AUTH
        );
        channel.publish('', MessagingQueue.AUTH_RESET, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
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

    const retryCount = originalMsg.properties.headers[RETRY_HEADER] ?? 0;

    try {
      await this.platformAuthorizationService.applyAuthorizationPolicy();
      this.logger.verbose?.(
        'Finished resetting authorization for platform.',
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          'Resetting authorization for platform failed! Max retries reached. Rejecting message.',
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for platform failed. Retrying (${
            retryCount + 1
          }/${MAX_RETRIES})`,
          LogContext.AUTH
        );
        channel.publish('', MessagingQueue.AUTH_RESET, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
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

    const retryCount = originalMsg.properties.headers[RETRY_HEADER] ?? 0;

    try {
      const user = await this.userService.getUserOrFail(payload.id);
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
      this.logger.verbose?.(
        `Finished resetting authorization for user with id ${payload}.`,
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          `Resetting authorization for user with id ${payload.id} failed! Max retries reached. Rejecting message.`,
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for user with id ${
            payload.id
          } failed. Retrying (${retryCount + 1}/${MAX_RETRIES})`,
          LogContext.AUTH
        );
        channel.publish('', MessagingQueue.AUTH_RESET, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
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

    const retryCount = originalMsg.properties.headers[RETRY_HEADER] ?? 0;

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
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          `Resetting authorization for organization with id ${payload.id} failed! Max retries reached. Rejecting message.`,
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for organization with id ${
            payload.id
          } failed. Retrying (${retryCount + 1}/${MAX_RETRIES})`,
          LogContext.AUTH
        );
        channel.publish('', MessagingQueue.AUTH_RESET, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
    }
  }
}
