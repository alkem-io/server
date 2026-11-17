import type { SecondFactorChangeObserverService } from '@core/auth/second-factor/second-factor.change.observer.service';
import type { RmqContext } from '@nestjs/microservices';
import { MessagingQueue } from '@src/common/enums/messaging.queue';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { SecondFactorChangedConsumer } from './second-factor-changed.consumer';

const noopLogger = { warn: vi.fn(), error: vi.fn(), verbose: vi.fn() };

function buildContext(headers?: Record<string, unknown>) {
  const channel = { ack: vi.fn(), reject: vi.fn(), publish: vi.fn() };
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

function buildConsumer(observerImpl?: () => Promise<void>) {
  const observer: { handleObservedChange: Mock } = {
    handleObservedChange: vi.fn(observerImpl ?? (async () => {})),
  };
  const consumer = new SecondFactorChangedConsumer(
    observer as unknown as SecondFactorChangeObserverService,
    noopLogger as never
  );
  return { consumer, observer };
}

const validData = {
  eventType: 'USER_SECOND_FACTOR_CHANGED',
  identityId: 'kratos-1',
  observedAt: '2026-11-11T10:30:45.000Z',
  sourceFlowId: 'flow-xyz',
  method: 'totp',
  request: { clientIp: '203.0.113.7', userAgent: 'Mozilla/5.0' },
};

describe('SecondFactorChangedConsumer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects without requeue an event without an identityId', async () => {
    const { consumer, observer } = buildConsumer();
    const { context, channel, message } = buildContext();

    await consumer.handleSecondFactorChanged(
      { ...validData, identityId: undefined },
      context
    );

    expect(channel.reject).toHaveBeenCalledWith(message, false);
    expect(observer.handleObservedChange).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown method', 'code'],
    ['no method', undefined],
  ])('rejects without requeue an event with %s', async (_label, method) => {
    const { consumer, observer } = buildConsumer();
    const { context, channel, message } = buildContext();

    await consumer.handleSecondFactorChanged(
      { ...validData, method } as never,
      context
    );

    expect(channel.reject).toHaveBeenCalledWith(message, false);
    expect(observer.handleObservedChange).not.toHaveBeenCalled();
  });

  it('maps a well-formed event onto the observer and acks', async () => {
    const { consumer, observer } = buildConsumer();
    const { context, channel, message } = buildContext();

    await consumer.handleSecondFactorChanged(validData, context);

    expect(observer.handleObservedChange).toHaveBeenCalledWith({
      identityId: 'kratos-1',
      method: 'totp',
      observedAt: '2026-11-11T10:30:45.000Z',
      sourceFlowId: 'flow-xyz',
      requestContext: { userAgent: 'Mozilla/5.0' },
    });
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('cuts the user agent to 256 characters and carries no address under any key', async () => {
    const { consumer, observer } = buildConsumer();
    const { context } = buildContext();

    await consumer.handleSecondFactorChanged(
      {
        ...validData,
        request: { clientIp: '203.0.113.7', userAgent: 'a'.repeat(300) },
      },
      context
    );

    const arg = observer.handleObservedChange.mock.calls[0][0];
    expect(arg.requestContext.userAgent).toHaveLength(256);
    expect(JSON.stringify(arg)).not.toContain('203.0.113.7');
  });

  it.each([
    ['no user agent', { clientIp: '203.0.113.7' }],
    ['an empty user agent', { clientIp: '203.0.113.7', userAgent: '' }],
  ])('passes no requestContext when the event carries %s', async (_label, request) => {
    const { consumer, observer } = buildConsumer();
    const { context } = buildContext();

    await consumer.handleSecondFactorChanged(
      { ...validData, request },
      context
    );

    expect(
      observer.handleObservedChange.mock.calls[0][0].requestContext
    ).toBeUndefined();
  });

  it('hands the same event delivered twice to the observer twice', async () => {
    const { consumer, observer } = buildConsumer();

    await consumer.handleSecondFactorChanged(validData, buildContext().context);
    await consumer.handleSecondFactorChanged(validData, buildContext().context);

    expect(observer.handleObservedChange).toHaveBeenCalledTimes(2);
  });

  it('republishes with the retry count incremented while under the budget', async () => {
    const { consumer } = buildConsumer(() => Promise.reject(new Error('db')));
    const { context, channel, message } = buildContext({ 'x-retry-count': 2 });

    await consumer.handleSecondFactorChanged(validData, context);

    expect(channel.publish).toHaveBeenCalledWith(
      '',
      MessagingQueue.KRATOS_EVENTS,
      message.content,
      { headers: { 'x-retry-count': 3 }, persistent: true }
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('rejects without requeue once the retry budget is spent', async () => {
    const { consumer } = buildConsumer(() => Promise.reject(new Error('db')));
    const { context, channel, message } = buildContext({ 'x-retry-count': 5 });

    await consumer.handleSecondFactorChanged(validData, context);

    expect(channel.reject).toHaveBeenCalledWith(message, false);
    expect(channel.publish).not.toHaveBeenCalled();
  });
});
