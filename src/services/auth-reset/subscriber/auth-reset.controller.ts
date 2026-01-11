import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext, MessagingQueue } from '@common/enums';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { RESET_EVENT_TYPE } from '../reset.event.type';
import { TaskService } from '@services/task/task.service';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AccountService } from '@domain/space/account/account.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { OrganizationLicenseService } from '@domain/community/organization/organization.service.license';
import { PlatformLicenseService } from '@platform/platform/platform.service.license';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
@Controller()
export class AuthResetController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private accountService: AccountService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private licenseService: LicenseService,
    private accountAuthorizationService: AccountAuthorizationService,
    private accountLicenseService: AccountLicenseService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private platformLicenseService: PlatformLicenseService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private userAuthorizationService: UserAuthorizationService,
    private organizationService: OrganizationService,
    private organizationLookupService: OrganizationLookupService,
    private organizationLicenseService: OrganizationLicenseService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private userService: UserService,
    private taskService: TaskService
  ) {}

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT, Transport.RMQ)
  public async authResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of authorization for account with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const account = await this.accountService.getAccountOrFail(payload.id);
      const updatedAuthorizations =
        await this.accountAuthorizationService.applyAuthorizationPolicy(
          account
        );
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);

      const message = `Finished resetting authorization for account with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);
      void this.taskService.updateTaskResults(payload.task, message);
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        const message = `Resetting authorization for account with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);
        void this.taskService.updateTaskErrors(payload.task, message);

        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for account with id ${
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

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT, Transport.RMQ)
  public async licenseResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of license for account with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const account = await this.accountService.getAccountOrFail(payload.id);
      const updatedLicenses =
        await this.accountLicenseService.applyLicensePolicy(account.id);
      await this.licenseService.saveAll(updatedLicenses);

      const message = `Finished resetting license for account with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);
      void this.taskService.updateTaskResults(payload.task, message);
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        const message = `Resetting license for account with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);
        void this.taskService.updateTaskErrors(payload.task, message);

        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  license reset for account with id ${
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

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION, Transport.RMQ)
  public async licenseResetOrganization(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `Starting reset of license for organization with id ${payload.id}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const organization =
        await this.organizationLookupService.getOrganizationByIdOrFail(
          payload.id
        );
      const updatedLicenses =
        await this.organizationLicenseService.applyLicensePolicy(
          organization.id
        );
      await this.licenseService.saveAll(updatedLicenses);

      const message = `Finished resetting license for organization with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);
      void this.taskService.updateTaskResults(payload.task, message);
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        const message = `Resetting license for organization with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);
        void this.taskService.updateTaskErrors(payload.task, message);

        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  license reset for organization with id ${
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

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_PLATFORM, Transport.RMQ)
  public async authResetPlatform(@Ctx() context: RmqContext) {
    this.logger.verbose?.(
      'Starting reset of authorization for platform',
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const authorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
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

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_PLATFORM, Transport.RMQ)
  public async licenseResetPlatform(@Ctx() context: RmqContext) {
    this.logger.verbose?.(
      'Starting reset of license for platform',
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const licenses = await this.platformLicenseService.applyLicensePolicy();
      await this.licenseService.saveAll(licenses);
      this.logger.verbose?.(
        'Finished resetting license for platform.',
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          'Resetting license for platform failed! Max retries reached. Rejecting message.',
          error?.stack,
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing license reset for platform failed. Retrying (${
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

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_AI_SERVER, Transport.RMQ)
  public async authResetAiServer(@Ctx() context: RmqContext) {
    this.logger.verbose?.(
      'Starting reset of authorization for AI Server',
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const authorizations =
        await this.aiServerAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
      this.logger.verbose?.(
        'Finished resetting authorization for AI Server.',
        LogContext.AUTH_POLICY
      );
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          'Resetting authorization for AI Server failed! Max retries reached. Rejecting message.',
          error?.stack,
          LogContext.AUTH
        );
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing  authorization reset for AI Server failed. Retrying (${
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

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER, Transport.RMQ)
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

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const user = await this.userService.getUserByIdOrFail(payload.id);
      const authorizations =
        await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
      await this.authorizationPolicyService.saveAll(authorizations);

      channel.ack(originalMsg);

      const message = `Finished resetting authorization for user with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);

      void this.taskService.updateTaskResults(payload.task, message);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        channel.reject(originalMsg, false); // Reject and don't requeue

        const message = `Resetting authorization for user with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);

        void this.taskService.updateTaskErrors(payload.task, message);
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

  @EventPattern(
    RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
    Transport.RMQ
  )
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

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const organization =
        await this.organizationService.getOrganizationByIdOrFail(payload.id);
      const authorizations =
        await this.organizationAuthorizationService.applyAuthorizationPolicy(
          organization
        );
      await this.authorizationPolicyService.saveAll(authorizations);
      channel.ack(originalMsg);

      const message = `Finished resetting authorization for organization with id ${payload.id}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);

      void this.taskService.updateTaskResults(payload.task, message);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        channel.reject(originalMsg, false); // Reject and don't requeue

        const message = `Resetting authorization for organization with id ${payload.id} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);

        void this.taskService.updateTaskErrors(payload.task, message);
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
