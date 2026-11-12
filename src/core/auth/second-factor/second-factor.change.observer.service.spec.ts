import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecondFactorChangeObserverService } from './second-factor.change.observer.service';

const SIGNAL_FAILURE_REASONS = [
  'timeout',
  'broker_unreachable',
  'network_error',
  'operation_failed',
  'unknown_error',
];

function build(opts: {
  user?: { id: string; email: string } | null;
  recordFactorChange?: () => Promise<void>;
  publish?: () => Promise<void>;
}) {
  const logger = { warn: vi.fn(), error: vi.fn(), verbose: vi.fn() };
  const audit = {
    recordFactorChange: vi.fn(opts.recordFactorChange ?? (async () => {})),
    recordSignalFailed: vi.fn(async () => {}),
  };
  const userLookup = {
    getUserByAuthenticationID: vi.fn(async () =>
      opts.user === undefined
        ? { id: 'user-1', email: 'member@example.com' }
        : opts.user
    ),
  };
  const notifications = {
    publishSecondFactorChangeSecuritySignal: vi.fn(
      opts.publish ?? (async () => {})
    ),
  };
  const service = new SecondFactorChangeObserverService(
    audit as never,
    userLookup as never,
    notifications as never,
    logger as never
  );
  return { service, audit, userLookup, notifications, logger };
}

/** Runs `run` with the retry backoff driven by a fake clock, not real sleeps. */
async function withRetryClock<T>(run: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  try {
    const result = run();
    await vi.runAllTimersAsync();
    return await result;
  } finally {
    vi.useRealTimers();
  }
}

describe('SecondFactorChangeObserverService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('handleObservedChange', () => {
    it('records the change for the linked member, then publishes the notice', async () => {
      const { service, audit, notifications } = build({});

      await service.handleObservedChange({
        identityId: 'kratos-1',
        method: 'totp',
        observedAt: '2026-11-11T10:00:00.000Z',
        sourceFlowId: 'flow-1',
        requestContext: { userAgent: 'Firefox' },
      });

      expect(audit.recordFactorChange).toHaveBeenCalledTimes(1);
      expect(audit.recordFactorChange).toHaveBeenCalledWith(
        { id: 'user-1' },
        {
          method: 'totp',
          observedAt: '2026-11-11T10:00:00.000Z',
          sourceFlowId: 'flow-1',
          requestContext: { userAgent: 'Firefox' },
          correlationId: expect.any(String),
        }
      );
      expect(
        notifications.publishSecondFactorChangeSecuritySignal
      ).toHaveBeenCalledWith({
        recipientEmail: 'member@example.com',
        observedAtISO8601: '2026-11-11T10:00:00.000Z',
      });
      expect(audit.recordFactorChange.mock.invocationCallOrder[0]).toBeLessThan(
        notifications.publishSecondFactorChangeSecuritySignal.mock
          .invocationCallOrder[0]
      );
    });

    it('takes now when the report carries no time', async () => {
      const { service, audit } = build({});
      const before = Date.now();

      await service.handleObservedChange({
        identityId: 'kratos-1',
        method: 'webauthn',
      });

      const observedAt = (audit.recordFactorChange.mock.calls[0] as any[])[1]
        .observedAt as string;
      expect(new Date(observedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('warns and writes nothing for an identity that links no user', async () => {
      const { service, audit, notifications, logger } = build({ user: null });

      await expect(
        service.handleObservedChange({
          identityId: 'kratos-unknown',
          method: 'lookup_secret',
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalled();
      expect(audit.recordFactorChange).not.toHaveBeenCalled();
      expect(
        notifications.publishSecondFactorChangeSecuritySignal
      ).not.toHaveBeenCalled();
    });

    it('rejects and publishes nothing when the row cannot be written', async () => {
      const { service, notifications } = build({
        recordFactorChange: () => Promise.reject(new Error('db down')),
      });

      await expect(
        service.handleObservedChange({ identityId: 'kratos-1', method: 'totp' })
      ).rejects.toThrow('db down');
      expect(
        notifications.publishSecondFactorChangeSecuritySignal
      ).not.toHaveBeenCalled();
    });

    it('records a failed notice once and resolves when every publish fails', async () => {
      const { service, audit, logger, notifications } = build({
        publish: () => Promise.reject(new Error('timeout reaching broker')),
      });

      await expect(
        withRetryClock(() =>
          service.handleObservedChange({
            identityId: 'kratos-1',
            method: 'totp',
          })
        )
      ).resolves.toBeUndefined();

      expect(
        notifications.publishSecondFactorChangeSecuritySignal
      ).toHaveBeenCalledTimes(3);
      expect(audit.recordSignalFailed).toHaveBeenCalledTimes(1);
      const [, failure] = audit.recordSignalFailed.mock.calls[0] as any[];
      expect(SIGNAL_FAILURE_REASONS).toContain(failure.failureReason);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('notify', () => {
    const member = { id: 'user-2', email: 'reset@example.com' };

    it('publishes the notice alone', async () => {
      const { service, audit, notifications } = build({});

      await service.notify(member, '2026-11-11T11:00:00.000Z', 'corr-reset');

      expect(
        notifications.publishSecondFactorChangeSecuritySignal
      ).toHaveBeenCalledWith({
        recipientEmail: 'reset@example.com',
        observedAtISO8601: '2026-11-11T11:00:00.000Z',
      });
      expect(audit.recordFactorChange).not.toHaveBeenCalled();
    });

    it('records the failed notice under the given correlation id, without an email', async () => {
      const { service, audit } = build({
        publish: () => Promise.reject(new Error('ECONNREFUSED')),
      });

      await withRetryClock(() =>
        service.notify(member, '2026-11-11T11:00:00.000Z', 'corr-reset')
      );

      expect(audit.recordSignalFailed).toHaveBeenCalledWith(
        { id: 'user-2' },
        { failureReason: 'broker_unreachable', correlationId: 'corr-reset' }
      );
      expect(JSON.stringify(audit.recordSignalFailed.mock.calls)).not.toContain(
        'reset@example.com'
      );
    });
  });
});
