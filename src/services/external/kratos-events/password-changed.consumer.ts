import { LogContext } from '@common/enums';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { UserPasswordChangeAuditService } from '@domain/community/user-password-change/user.password.change.audit.service';
import { UserPasswordChangeObserverService } from '@domain/community/user-password-change/user.password.change.observer.service';
import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { MessagingQueue } from '@src/common/enums/messaging.queue';
import { Channel, Message } from 'amqplib';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Broker event pattern published by the Go `kratos-webhooks` service when a
 * Kratos self-service settings flow changes a user's password. The Go client
 * emits the NestJS `{ pattern, data }` envelope, so `@EventPattern` dispatches
 * on this string natively. See
 * `specs/005-kratos-password-changed-queue/contracts/password-changed-event.md`.
 */
export const USER_PASSWORD_CHANGED_PATTERN = 'USER_PASSWORD_CHANGED';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';

/**
 * Wire shape of the `USER_PASSWORD_CHANGED` event `data` block (the contract).
 * Optional everywhere except `identityId` — the consumer rejects a payload that
 * lacks a usable identity (poison-message safety, FR-008).
 */
interface PasswordChangedEventData {
  eventType?: string;
  identityId?: string;
  observedAt?: string;
  sourceFlowId?: string;
  request?: {
    clientIp?: string;
    userAgent?: string;
  };
}

/**
 * Consumer adapter for the `USER_PASSWORD_CHANGED` broker event (spec 005).
 *
 * It is a thin transport adapter in front of the existing
 * `UserPasswordChangeObserverService`: it maps the event onto
 * `HandlePasswordChangeObservedInput` and adds the idempotency guard the
 * observer lacks (FR-005). It does NOT change the observer, the audit record,
 * or the security-signal email (FR-004).
 *
 * Trust boundary (FR-007): the producing endpoint is in-cluster only (Service
 * DNS, no public Traefik route); this consumer applies no application-layer
 * auth, consistent with the verification + login-backoff webhooks.
 */
@Controller()
export class PasswordChangedConsumer {
  constructor(
    private readonly observerService: UserPasswordChangeObserverService,
    private readonly auditService: UserPasswordChangeAuditService,
    private readonly userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @EventPattern(USER_PASSWORD_CHANGED_PATTERN, Transport.RMQ)
  public async handlePasswordChanged(
    @Payload() data: PasswordChangedEventData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    // Poison-message safety (FR-008): an event without a usable identity can
    // never succeed on redelivery — reject WITHOUT requeue so it does not loop.
    const identityId = data?.identityId;
    if (!identityId || typeof identityId !== 'string') {
      this.logger.warn(
        'USER_PASSWORD_CHANGED received without a usable identityId — rejecting (no requeue)',
        LogContext.KRATOS_HOOKS
      );
      channel.reject(originalMsg, false);
      return;
    }

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;

    try {
      const subject =
        await this.userLookupService.getUserByAuthenticationID(identityId);

      // Idempotency guard (FR-005), keyed `(identityId, sourceFlowId)`. We only
      // dedupe when we can resolve a subject AND a sourceFlowId — the audit row
      // (the system of record) is keyed by subject + flow. A redelivery of an
      // already-recorded change is a no-op + ack; the observer is never invoked
      // a second time, so no duplicate audit row or email results.
      if (subject && data.sourceFlowId) {
        const alreadyObserved = await this.auditService.existsObservedFor(
          subject.id,
          data.sourceFlowId
        );
        if (alreadyObserved) {
          this.logger.verbose?.(
            `USER_PASSWORD_CHANGED already observed for identity ${identityId} (flow ${data.sourceFlowId}) — no-op`,
            LogContext.KRATOS_HOOKS
          );
          channel.ack(originalMsg);
          return;
        }
      }

      await this.observerService.handleObservedPasswordChange({
        identityId,
        observedAt: data.observedAt,
        sourceFlowId: data.sourceFlowId,
        requestContext: {
          ip: data.request?.clientIp,
          userAgent: data.request?.userAgent,
        },
      });

      channel.ack(originalMsg);
    } catch (error: any) {
      // Transient downstream failure (DB/notification path): bounded requeue,
      // mirroring the auth-reset retry-header approach. Exhausting the budget
      // rejects without requeue to avoid an infinite loop.
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          `USER_PASSWORD_CHANGED processing for identity ${identityId} failed; max retries reached — rejecting`,
          error?.stack,
          LogContext.KRATOS_HOOKS
        );
        channel.reject(originalMsg, false);
      } else {
        this.logger.warn(
          `USER_PASSWORD_CHANGED processing for identity ${identityId} failed; retrying (${
            retryCount + 1
          }/${MAX_RETRIES})`,
          LogContext.KRATOS_HOOKS
        );
        channel.publish('', MessagingQueue.KRATOS_EVENTS, originalMsg.content, {
          headers: { [RETRY_HEADER]: retryCount + 1 },
          persistent: true,
        });
        channel.ack(originalMsg);
      }
    }
  }
}
