import { LogContext, MessagingQueue } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { OrganizationLicenseService } from '@domain/community/organization/organization.service.license';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { Controller, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { PlatformLicenseService } from '@platform/platform/platform.service.license';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { TaskService } from '@services/task/task.service';
import { AlkemioConfig } from '@src/types';
import { Channel, Message } from 'amqplib';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { RESET_EVENT_TYPE } from '../reset.event.type';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
@Controller()
export class AuthResetController {
  private readonly concurrency: number;

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
    private organizationLicenseService: OrganizationLicenseService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private taskService: TaskService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.concurrency =
      this.configService.get('authorization.concurrency', {
        infer: true,
      }) ?? 5;
  }

  /**
   * Processes items concurrently with a bounded concurrency limit.
   * Returns results in the same order as the input.
   */
  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await fn(items[index]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () =>
        worker()
      )
    );
    return results;
  }

  private async collectAuthPoliciesWithRetry(
    entityId: string,
    entityType: string,
    taskId: string,
    processor: (id: string) => Promise<IAuthorizationPolicy[]>
  ): Promise<IAuthorizationPolicy[]> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const policies = await processor(entityId);
        const message = `Finished resetting authorization for ${entityType} with id ${entityId}.`;
        this.logger.verbose?.(message, LogContext.AUTH_POLICY);
        this.taskService.updateTaskResults(taskId, message);
        return policies;
      } catch (error: any) {
        if (attempt >= MAX_RETRIES) {
          const message = `Resetting authorization for ${entityType} with id ${entityId} failed after ${MAX_RETRIES} retries.`;
          this.logger.error(message, error?.stack, LogContext.AUTH);
          this.taskService.updateTaskErrors(taskId, message);
        } else {
          this.logger.warn(
            `Processing authorization reset for ${entityType} with id ${entityId} failed. Retrying (${attempt + 1}/${MAX_RETRIES})`,
            LogContext.AUTH
          );
        }
      }
    }
    return [];
  }

  private async collectLicensesWithRetry(
    entityId: string,
    entityType: string,
    taskId: string,
    processor: (id: string) => Promise<ILicense[]>
  ): Promise<ILicense[]> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const licenses = await processor(entityId);
        const message = `Finished resetting license for ${entityType} with id ${entityId}.`;
        this.logger.verbose?.(message, LogContext.AUTH_POLICY);
        this.taskService.updateTaskResults(taskId, message);
        return licenses;
      } catch (error: any) {
        if (attempt >= MAX_RETRIES) {
          const message = `Resetting license for ${entityType} with id ${entityId} failed after ${MAX_RETRIES} retries.`;
          this.logger.error(message, error?.stack, LogContext.AUTH);
          this.taskService.updateTaskErrors(taskId, message);
        } else {
          this.logger.warn(
            `Processing license reset for ${entityType} with id ${entityId} failed. Retrying (${attempt + 1}/${MAX_RETRIES})`,
            LogContext.AUTH
          );
        }
      }
    }
    return [];
  }

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT, Transport.RMQ)
  public async authResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    const entityIds = payload.ids ?? [payload.id];
    this.logger.verbose?.(
      `Starting reset of authorization for ${entityIds.length} account(s).`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const policyArrays = await this.mapWithConcurrency(
      entityIds,
      this.concurrency,
      async (entityId) => {
        return this.collectAuthPoliciesWithRetry(
          entityId,
          'account',
          payload.task,
          async (id: string) => {
            const account = await this.accountService.getAccountOrFail(id);
            return this.accountAuthorizationService.applyAuthorizationPolicy(
              account
            );
          }
        );
      }
    );
    const allPolicies = policyArrays.flat();
    if (allPolicies.length > 0) {
      await this.authorizationPolicyService.bulkUpdate(allPolicies);
    }
    channel.ack(originalMsg);
  }

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT, Transport.RMQ)
  public async licenseResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    const entityIds = payload.ids ?? [payload.id];
    this.logger.verbose?.(
      `Starting reset of license for ${entityIds.length} account(s).`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const licenseArrays = await this.mapWithConcurrency(
      entityIds,
      this.concurrency,
      async (entityId) => {
        return this.collectLicensesWithRetry(
          entityId,
          'account license',
          payload.task,
          async (id: string) => {
            return this.accountLicenseService.applyLicensePolicy(id);
          }
        );
      }
    );
    const allLicenses = licenseArrays.flat();
    if (allLicenses.length > 0) {
      await this.licenseService.saveAll(allLicenses);
    }
    channel.ack(originalMsg);
  }

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION, Transport.RMQ)
  public async licenseResetOrganization(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    const entityIds = payload.ids ?? [payload.id];
    this.logger.verbose?.(
      `Starting reset of license for ${entityIds.length} organization(s).`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const licenseArrays = await this.mapWithConcurrency(
      entityIds,
      this.concurrency,
      async (entityId) => {
        return this.collectLicensesWithRetry(
          entityId,
          'organization license',
          payload.task,
          async (id: string) => {
            return this.organizationLicenseService.applyLicensePolicy(id);
          }
        );
      }
    );
    const allLicenses = licenseArrays.flat();
    if (allLicenses.length > 0) {
      await this.licenseService.saveAll(allLicenses);
    }
    channel.ack(originalMsg);
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
    const entityIds = payload.ids ?? [payload.id];
    this.logger.verbose?.(
      `Starting reset of authorization for ${entityIds.length} user(s).`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const policyArrays = await this.mapWithConcurrency(
      entityIds,
      this.concurrency,
      async (entityId) => {
        return this.collectAuthPoliciesWithRetry(
          entityId,
          'user',
          payload.task,
          async (id: string) => {
            return this.userAuthorizationService.applyAuthorizationPolicy(id);
          }
        );
      }
    );
    const allPolicies = policyArrays.flat();
    if (allPolicies.length > 0) {
      await this.authorizationPolicyService.bulkUpdate(allPolicies);
    }
    channel.ack(originalMsg);
  }

  @EventPattern(
    RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
    Transport.RMQ
  )
  public async authResetOrganization(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    const entityIds = payload.ids ?? [payload.id];
    this.logger.verbose?.(
      `Starting reset of authorization for ${entityIds.length} organization(s).`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const policyArrays = await this.mapWithConcurrency(
      entityIds,
      this.concurrency,
      async (entityId) => {
        return this.collectAuthPoliciesWithRetry(
          entityId,
          'organization',
          payload.task,
          async (id: string) => {
            const organization =
              await this.organizationService.getOrganizationOrFail(id);
            return this.organizationAuthorizationService.applyAuthorizationPolicy(
              organization
            );
          }
        );
      }
    );
    const allPolicies = policyArrays.flat();
    if (allPolicies.length > 0) {
      await this.authorizationPolicyService.bulkUpdate(allPolicies);
    }
    channel.ack(originalMsg);
  }
}
