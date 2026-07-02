import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { OrganizationLicenseService } from '@domain/community/organization/organization.service.license';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserService } from '@domain/community/user/user.service';
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
import { AuthResetWorkerState } from './auth-reset.worker-state.service';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
@Controller()
export class AuthResetController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly workerState: AuthResetWorkerState,
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
    private taskService: TaskService,
    configService: ConfigService<AlkemioConfig, true>
  ) {
    // Same config key the publisher proxy and main.ts bind use, so retry
    // re-publishes land back on the exact queue this worker consumes.
    this.authResetQueue = configService.get(
      'microservices.rabbitmq.auth_reset.queue',
      { infer: true }
    );
  }

  private readonly authResetQueue: string;

  /**
   * Shared processing shell for every reset event.
   *
   * Centralizes the delivery lifecycle so all handlers behave identically:
   *  - tracks the job via {@link AuthResetWorkerState} so a SIGTERM drain can
   *    wait for the in-flight reset to finish (begin/end around the work);
   *  - on success: acks and records the task result (when a task is supplied);
   *  - on failure under the retry limit: re-publishes with an incremented
   *    `x-retry-count` header and acks the original (counter survives);
   *  - on failure at the limit: rejects without requeue (dead message) and
   *    records the task error.
   *
   * `subject` is a human phrase like `authorization for account with id <uuid>`
   * used to build the start/success/failure log lines uniformly.
   */
  private async handleReset(
    context: RmqContext,
    subject: string,
    work: () => Promise<void>,
    task?: string
  ): Promise<void> {
    this.logger.verbose?.(
      `Starting reset of ${subject}.`,
      LogContext.AUTH_POLICY
    );
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;
    // Normalize the retry header: it is an RMQ integration boundary, so a
    // missing or malformed value must not leak a non-number into `retryCount + 1`
    // (string concatenation) or the limit comparison. Fall back to 0.
    const parsedRetry = Number(originalMsg.properties.headers?.[RETRY_HEADER]);
    const retryCount =
      Number.isInteger(parsedRetry) && parsedRetry >= 0 ? parsedRetry : 0;

    this.workerState.begin();
    try {
      await work();

      const message = `Finished resetting ${subject}.`;
      this.logger.verbose?.(message, LogContext.AUTH_POLICY);
      if (task) {
        // Awaited so the task cache write completes before the message is acked,
        // but isolated (recordTaskResult swallows its own errors) so a task-cache
        // hiccup can never requeue a reset that already succeeded.
        await this.recordTaskResult(task, message);
      }
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        const message = `Resetting ${subject} failed! Max retries reached. Rejecting message.`;
        this.logger.error(message, error?.stack, LogContext.AUTH);
        if (task) {
          await this.recordTaskError(task, message);
        }
        channel.reject(originalMsg, false); // Reject and don't requeue
      } else {
        this.logger.warn(
          `Processing reset of ${subject} failed. Retrying (${
            retryCount + 1
          }/${MAX_RETRIES})`,
          LogContext.AUTH
        );
        channel.publish('', this.authResetQueue, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true, // Make the message durable
        });
        channel.ack(originalMsg); // Acknowledge the original message
      }
    } finally {
      this.workerState.end();
    }
  }

  /**
   * Persist a task result, swallowing any failure. Task tracking is best-effort
   * telemetry — it must never throw back into the reset flow (which would requeue
   * an already-successful reset), so its errors are logged and contained here.
   */
  private async recordTaskResult(task: string, message: string): Promise<void> {
    try {
      await this.taskService.updateTaskResults(task, message);
    } catch (error: any) {
      this.logger.warn(
        `Failed to persist task result for task ${task}: ${error?.message}`,
        LogContext.AUTH
      );
    }
  }

  /** As {@link recordTaskResult}, for the terminal (max-retries) error path. */
  private async recordTaskError(task: string, message: string): Promise<void> {
    try {
      await this.taskService.updateTaskErrors(task, message);
    } catch (error: any) {
      this.logger.warn(
        `Failed to persist task error for task ${task}: ${error?.message}`,
        LogContext.AUTH
      );
    }
  }

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT, Transport.RMQ)
  public async authResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    await this.handleReset(
      context,
      `authorization for account with id ${payload.id}`,
      async () => {
        const account = await this.accountService.getAccountOrFail(payload.id);
        const updatedAuthorizations =
          await this.accountAuthorizationService.applyAuthorizationPolicy(
            account
          );
        await this.authorizationPolicyService.saveAll(updatedAuthorizations);
      },
      payload.task
    );
  }

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT, Transport.RMQ)
  public async licenseResetAccount(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    await this.handleReset(
      context,
      `license for account with id ${payload.id}`,
      async () => {
        const account = await this.accountService.getAccountOrFail(payload.id);
        const updatedLicenses =
          await this.accountLicenseService.applyLicensePolicy(account.id);
        await this.licenseService.saveAll(updatedLicenses);
      },
      payload.task
    );
  }

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION, Transport.RMQ)
  public async licenseResetOrganization(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    await this.handleReset(
      context,
      `license for organization with id ${payload.id}`,
      async () => {
        const organization =
          await this.organizationLookupService.getOrganizationByIdOrFail(
            payload.id
          );
        const updatedLicenses =
          await this.organizationLicenseService.applyLicensePolicy(
            organization.id
          );
        await this.licenseService.saveAll(updatedLicenses);
      },
      payload.task
    );
  }

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_PLATFORM, Transport.RMQ)
  public async authResetPlatform(@Ctx() context: RmqContext) {
    await this.handleReset(context, 'authorization for platform', async () => {
      const authorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
    });
  }

  @EventPattern(RESET_EVENT_TYPE.LICENSE_RESET_PLATFORM, Transport.RMQ)
  public async licenseResetPlatform(@Ctx() context: RmqContext) {
    await this.handleReset(context, 'license for platform', async () => {
      const licenses = await this.platformLicenseService.applyLicensePolicy();
      await this.licenseService.saveAll(licenses);
    });
  }

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_AI_SERVER, Transport.RMQ)
  public async authResetAiServer(@Ctx() context: RmqContext) {
    await this.handleReset(context, 'authorization for AI Server', async () => {
      const authorizations =
        await this.aiServerAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(authorizations);
    });
  }

  @EventPattern(RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER, Transport.RMQ)
  public async authResetUser(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    await this.handleReset(
      context,
      `authorization for user with id ${payload.id}`,
      async () => {
        const user = await this.userService.getUserByIdOrFail(payload.id);
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
        await this.authorizationPolicyService.saveAll(authorizations);
      },
      payload.task
    );
  }

  @EventPattern(
    RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
    Transport.RMQ
  )
  public async authResetOrganization(
    @Payload() payload: AuthResetEventPayload,
    @Ctx() context: RmqContext
  ) {
    await this.handleReset(
      context,
      `authorization for organization with id ${payload.id}`,
      async () => {
        const organization =
          await this.organizationService.getOrganizationOrFail(payload.id);
        const authorizations =
          await this.organizationAuthorizationService.applyAuthorizationPolicy(
            organization
          );
        await this.authorizationPolicyService.saveAll(authorizations);
      },
      payload.task
    );
  }
}
