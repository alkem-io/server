import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { SpaceService } from '@domain/space/space/space.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext, MessagingQueue } from '@common/enums';
import { PlatformAuthorizationService } from '@platform/platfrom/platform.service.authorization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AUTH_RESET_EVENT_TYPE } from '../event.type';
import { TaskService } from '@services/task/task.service';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
@Controller()
export class AuthResetController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private spaceService: SpaceService,
    private accountAuthorizationService: AccountAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private userAuthorizationService: UserAuthorizationService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private taskService: TaskService
  ) {}

  @EventPattern(AUTH_RESET_EVENT_TYPE.SPACE, Transport.RMQ)
  public async authResetSpace(
    @Payload() payload: AuthResetEventPayload,
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
      const space = await this.spaceService.getSpaceOrFail(payload.id, {
        relations: {
          account: true,
        },
      });
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        space.account
      );

      const message = `Finished resetting authorization for space with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);
      this.taskService.updateTaskResults(payload.task, message);
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        const message = `Resetting authorization for space with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);
        this.taskService.updateTaskErrors(payload.task, message);

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

  @EventPattern(AUTH_RESET_EVENT_TYPE.PLATFORM, Transport.RMQ)
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
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          'Resetting authorization for platform failed! Max retries reached. Rejecting message.',
          error?.stack,
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

  @EventPattern(AUTH_RESET_EVENT_TYPE.USER, Transport.RMQ)
  public async authResetUser(
    @Payload() payload: AuthResetEventPayload,
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
      channel.ack(originalMsg);

      const message = `Finished resetting authorization for user with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);

      this.taskService.updateTaskResults(payload.task, message);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        channel.reject(originalMsg, false); // Reject and don't requeue

        const message = `Resetting authorization for user with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);

        this.taskService.updateTaskErrors(payload.task, message);
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

  @EventPattern(AUTH_RESET_EVENT_TYPE.ORGANIZATION, Transport.RMQ)
  public async authResetOrganization(
    @Payload() payload: AuthResetEventPayload,
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
      channel.ack(originalMsg);

      const message = `Finished resetting authorization for organization with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);

      this.taskService.updateTaskResults(payload.task, message);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        channel.reject(originalMsg, false); // Reject and don't requeue

        const message = `Resetting authorization for organization with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);

        this.taskService.updateTaskErrors(payload.task, message);
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
