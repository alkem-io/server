import type { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import type { UserPasswordChangeAuditService } from '@domain/community/user-password-change/user.password.change.audit.service';
import type { UserPasswordChangeObserverService } from '@domain/community/user-password-change/user.password.change.observer.service';
import type { RmqContext } from '@nestjs/microservices';
import { MessagingQueue } from '@src/common/enums/messaging.queue';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PasswordChangedConsumer } from './password-changed.consumer';

const noopLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
} as const;

interface MockChannel {
  ack: Mock;
  reject: Mock;
  publish: Mock;
}

function buildContext(headers?: Record<string, unknown>): {
  context: RmqContext;
  channel: MockChannel;
  message: {
    content: Buffer;
    properties: { headers?: Record<string, unknown> };
  };
} {
  const channel: MockChannel = {
    ack: vi.fn(),
    reject: vi.fn(),
    publish: vi.fn(),
  };
  const message = {
    content: Buffer.from('payload'),
    properties: { headers },
  };
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as unknown as RmqContext;
  return { context, channel, message };
}

const DEFAULT_USER = { id: 'user-1', email: 'u@example.com' };

function buildConsumer(overrides?: {
  user?: { id: string; email: string } | null;
  alreadyObserved?: boolean;
  observerImpl?: () => Promise<unknown>;
}) {
  const observer: { handleObservedPasswordChange: Mock } = {
    handleObservedPasswordChange: vi.fn(
      overrides?.observerImpl ?? (async () => ({ recorded: true }))
    ),
  };
  const audit: { existsObservedFor: Mock } = {
    existsObservedFor: vi.fn(async () => overrides?.alreadyObserved ?? false),
  };
  const resolvedUser =
    overrides && 'user' in overrides ? overrides.user : DEFAULT_USER;
  const userLookup: { getUserByAuthenticationID: Mock } = {
    getUserByAuthenticationID: vi.fn(async () => resolvedUser),
  };
  const consumer = new PasswordChangedConsumer(
    observer as unknown as UserPasswordChangeObserverService,
    audit as unknown as UserPasswordChangeAuditService,
    userLookup as unknown as UserLookupService,
    noopLogger as unknown as never
  );
  return { consumer, observer, audit, userLookup };
}

const validData = {
  eventType: 'USER_PASSWORD_CHANGED',
  identityId: 'kratos-1',
  observedAt: '2026-06-01T10:30:45.000Z',
  sourceFlowId: 'flow-xyz',
  request: { clientIp: '203.0.113.7', userAgent: 'Mozilla/5.0' },
};

describe('PasswordChangedConsumer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the event onto the observer input per the contract and acks', async () => {
    const { consumer, observer } = buildConsumer();
    const { context, channel } = buildContext();

    await consumer.handlePasswordChanged(validData, context);

    expect(observer.handleObservedPasswordChange).toHaveBeenCalledTimes(1);
    expect(observer.handleObservedPasswordChange.mock.calls[0][0]).toEqual({
      identityId: 'kratos-1',
      observedAt: '2026-06-01T10:30:45.000Z',
      sourceFlowId: 'flow-xyz',
      requestContext: { ip: '203.0.113.7', userAgent: 'Mozilla/5.0' },
    });
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.reject).not.toHaveBeenCalled();
  });

  it('rejects WITHOUT requeue when identityId is missing (poison message)', async () => {
    const { consumer, observer } = buildConsumer();
    const { context, channel } = buildContext();

    await consumer.handlePasswordChanged(
      { ...validData, identityId: undefined } as never,
      context
    );

    expect(observer.handleObservedPasswordChange).not.toHaveBeenCalled();
    expect(channel.reject).toHaveBeenCalledWith(expect.anything(), false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('no-ops (single audit/email) and acks when the change was already observed (redelivery)', async () => {
    const { consumer, observer, audit } = buildConsumer({
      alreadyObserved: true,
    });
    const { context, channel } = buildContext();

    await consumer.handlePasswordChanged(validData, context);

    expect(audit.existsObservedFor).toHaveBeenCalledWith('user-1', 'flow-xyz');
    expect(observer.handleObservedPasswordChange).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.reject).not.toHaveBeenCalled();
  });

  it('processes two genuinely distinct flows (different sourceFlowId) without deduping', async () => {
    const { consumer, observer } = buildConsumer({ alreadyObserved: false });

    const a = buildContext();
    await consumer.handlePasswordChanged(
      { ...validData, sourceFlowId: 'flow-a' },
      a.context
    );
    const b = buildContext();
    await consumer.handlePasswordChanged(
      { ...validData, sourceFlowId: 'flow-b' },
      b.context
    );

    expect(observer.handleObservedPasswordChange).toHaveBeenCalledTimes(2);
    expect(a.channel.ack).toHaveBeenCalledTimes(1);
    expect(b.channel.ack).toHaveBeenCalledTimes(1);
  });

  it('skips the dedupe lookup but still observes when sourceFlowId is absent', async () => {
    const { consumer, observer, audit } = buildConsumer();
    const { context, channel } = buildContext();

    await consumer.handlePasswordChanged(
      { ...validData, sourceFlowId: undefined },
      context
    );

    expect(audit.existsObservedFor).not.toHaveBeenCalled();
    expect(observer.handleObservedPasswordChange).toHaveBeenCalledTimes(1);
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('lets the observer drop (acks) when the identity has no linked user', async () => {
    const { consumer, observer, audit } = buildConsumer({
      user: null,
      observerImpl: async () => ({ recorded: false }),
    });
    const { context, channel } = buildContext();

    await consumer.handlePasswordChanged(validData, context);

    expect(audit.existsObservedFor).not.toHaveBeenCalled();
    expect(observer.handleObservedPasswordChange).toHaveBeenCalledTimes(1);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.reject).not.toHaveBeenCalled();
  });

  it('requeues with an incremented retry header on a transient downstream error', async () => {
    const { consumer } = buildConsumer({
      observerImpl: async () => {
        throw new Error('ECONNREFUSED db');
      },
    });
    const { context, channel } = buildContext({ 'x-retry-count': 2 });

    await consumer.handlePasswordChanged(validData, context);

    expect(channel.publish).toHaveBeenCalledTimes(1);
    const [exchange, queue, , options] = channel.publish.mock.calls[0];
    expect(exchange).toBe('');
    expect(queue).toBe(MessagingQueue.KRATOS_EVENTS);
    expect(options.headers).toEqual({ 'x-retry-count': 3 });
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.reject).not.toHaveBeenCalled();
  });

  it('rejects WITHOUT requeue once the retry budget is exhausted', async () => {
    const { consumer } = buildConsumer({
      observerImpl: async () => {
        throw new Error('ECONNREFUSED db');
      },
    });
    const { context, channel } = buildContext({ 'x-retry-count': 5 });

    await consumer.handlePasswordChanged(validData, context);

    expect(channel.publish).not.toHaveBeenCalled();
    expect(channel.reject).toHaveBeenCalledWith(expect.anything(), false);
    expect(channel.ack).not.toHaveBeenCalled();
  });
});
