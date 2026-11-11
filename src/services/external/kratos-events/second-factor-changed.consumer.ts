import { LogContext } from '@common/enums';
import { SecondFactorMethod } from '@core/auth/second-factor/second-factor.audit.service';
import { SecondFactorChangeObserverService } from '@core/auth/second-factor/second-factor.change.observer.service';
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
 * Broker event published by the Go `kratos-webhooks` service when a Kratos
 * settings flow changes a member's second factor: the password-change event's
 * shape plus `method`.
 */
export const USER_SECOND_FACTOR_CHANGED_PATTERN = 'USER_SECOND_FACTOR_CHANGED';

const MAX_RETRIES = 5;
const RETRY_HEADER = 'x-retry-count';
const USER_AGENT_MAX_LENGTH = 256;

const METHODS: ReadonlySet<string> = new Set<SecondFactorMethod>([
  'totp',
  'webauthn',
  'lookup_secret',
]);

interface SecondFactorChangedEventData {
  eventType?: string;
  identityId?: string;
  observedAt?: string;
  sourceFlowId?: string;
  method?: string;
  request?: {
    clientIp?: string;
    userAgent?: string;
  };
}

/**
 * Adapts `USER_SECOND_FACTOR_CHANGED` onto the observer. No idempotency
 * guard: one settings flow may carry several changes, so a redelivery
 * writes a second row and sends a second notice. The reported client address
 * is not read: the hook takes it from a header the sender sets.
 */
@Controller()
export class SecondFactorChangedConsumer {
  constructor(
    private readonly observerService: SecondFactorChangeObserverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @EventPattern(USER_SECOND_FACTOR_CHANGED_PATTERN, Transport.RMQ)
  public async handleSecondFactorChanged(
    @Payload() data: SecondFactorChangedEventData,
    @Ctx() context: RmqContext
  ): Promise<void> {
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    const identityId = data?.identityId;
    const method = data?.method;
    if (
      !identityId ||
      typeof identityId !== 'string' ||
      typeof method !== 'string' ||
      !METHODS.has(method)
    ) {
      this.logger.warn(
        'USER_SECOND_FACTOR_CHANGED received without a usable identityId or method — rejecting (no requeue)',
        LogContext.KRATOS_HOOKS
      );
      channel.reject(originalMsg, false);
      return;
    }

    const retryCount = originalMsg.properties.headers?.[RETRY_HEADER] ?? 0;
    const userAgent = data.request?.userAgent;

    try {
      await this.observerService.handleObservedChange({
        identityId,
        method: method as SecondFactorMethod,
        observedAt: data.observedAt,
        sourceFlowId: data.sourceFlowId,
        requestContext:
          typeof userAgent === 'string'
            ? { userAgent: userAgent.slice(0, USER_AGENT_MAX_LENGTH) }
            : undefined,
      });
      channel.ack(originalMsg);
    } catch (error: any) {
      if (retryCount >= MAX_RETRIES) {
        this.logger.error(
          `USER_SECOND_FACTOR_CHANGED processing for identity ${identityId} failed; max retries reached — rejecting`,
          error?.stack,
          LogContext.KRATOS_HOOKS
        );
        channel.reject(originalMsg, false);
      } else {
        this.logger.warn(
          `USER_SECOND_FACTOR_CHANGED processing for identity ${identityId} failed; retrying (${
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
