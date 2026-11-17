import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUserSecondFactorService } from './admin.user.second.factor.service';

const ADMIN_ID = 'admin-1';
const TARGET = {
  id: 'user-2',
  email: 'member@example.com',
  authenticationID: 'kratos-2',
};
const FACTORS = ['totp', 'webauthn', 'lookup_secret'];

const admin = Object.assign(new ActorContext(), {
  actorID: ADMIN_ID,
  credentials: [{ type: 'platform-support', resourceID: '' }],
});

const report = (overrides: Record<string, unknown> = {}) => ({
  sub: TARGET.authenticationID,
  reason: 'second_factor_reset',
  correlationId: 'x',
  entries: [],
  revokedCount: 2,
  failedCount: 0,
  tokenRevocationFailedCount: 0,
  complete: true,
  subjectMarked: true,
  ...overrides,
});

const timeoutError = () =>
  Object.assign(new Error('timeout of 5000ms exceeded'), {
    code: 'ECONNABORTED',
  });
const httpError = (status: number) =>
  Object.assign(new Error('Request failed with status code ' + status), {
    response: { status },
  });

function build(
  opts: {
    target?: Partial<typeof TARGET> | null;
    deleteCredential?: (id: string, type: string) => Promise<boolean>;
    invalidateSessions?: () => Promise<void>;
    revoke?: () => Promise<unknown>;
    recordStarted?: () => Promise<void>;
    recordFailed?: () => Promise<void>;
    recordCompleted?: () => Promise<void>;
    notify?: () => Promise<void>;
    replacePassword?: (
      call: number
    ) => Promise<{ lastChangedAt?: string } | null>;
  } = {}
) {
  let passwordCalls = 0;
  const calls: string[] = [];
  const logger = { error: vi.fn(), warn: vi.fn(), verbose: vi.fn() };
  const userLookup = {
    getUserByIdOrFail: vi.fn(async () => {
      if (opts.target === null) {
        throw new EntityNotFoundException('User not found', 'test' as never);
      }
      return { ...TARGET, ...opts.target };
    }),
  };
  const audit = {
    recordResetStarted: vi.fn(async () => {
      calls.push('started');
      return opts.recordStarted?.();
    }),
    recordResetCompleted: vi.fn(async () => {
      calls.push('completed');
      return opts.recordCompleted?.();
    }),
    recordResetFailed: vi.fn(async () => {
      calls.push('failed');
      return opts.recordFailed?.();
    }),
  };
  const kratos = {
    deleteIdentityCredential: vi.fn(async (id: string, type: string) => {
      calls.push(`delete:${type}`);
      return opts.deleteCredential ? opts.deleteCredential(id, type) : true;
    }),
    invalidateAllIdentitySessions: vi.fn(async () => {
      calls.push('kratos-sessions');
      return opts.invalidateSessions?.();
    }),
    replacePasswordWithUnusableSecret: vi.fn(async () => {
      passwordCalls += 1;
      calls.push('password');
      return opts.replacePassword
        ? opts.replacePassword(passwordCalls)
        : { lastChangedAt: `password-time-${passwordCalls}` };
    }),
  };
  const revocation = {
    revokeAllForSub: vi.fn(async () => {
      calls.push('revoke');
      return opts.revoke ? opts.revoke() : report();
    }),
  };
  const observer = {
    notify: vi.fn(async () => {
      calls.push('notify');
      return opts.notify?.();
    }),
  };
  const service = new AdminUserSecondFactorService(
    userLookup as never,
    kratos as never,
    revocation as never,
    audit as never,
    observer as never,
    logger as never
  );
  return { service, calls, audit, kratos, revocation, observer, logger };
}

const correlationIdOf = (mock: { mock: { calls: unknown[][] } }) =>
  (mock.mock.calls[0]?.[2] as { correlationId: string }).correlationId;

describe('AdminUserSecondFactorService.resetSecondFactor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a target that links no identity, before any row', async () => {
    const { service, audit, kratos } = build({
      target: { authenticationID: '' },
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(audit.recordResetStarted).not.toHaveBeenCalled();
    expect(kratos.deleteIdentityCredential).not.toHaveBeenCalled();
  });

  it('refuses the admin’s own account with self_target, before any row', async () => {
    const { service, audit } = build();

    const error = await service
      .resetSecondFactor(admin, ADMIN_ID, true)
      .catch(e => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.details).toMatchObject({ reason: 'self_target' });
    expect(audit.recordResetStarted).not.toHaveBeenCalled();
  });

  it('runs in order: intent, removals, Kratos sessions, removals again, revocation, outcome, notice', async () => {
    const { service, calls, kratos, revocation, audit, observer } = build();

    const result = await service.resetSecondFactor(admin, TARGET.id, false);

    expect(calls).toEqual([
      'started',
      ...FACTORS.map(f => `delete:${f}`),
      'kratos-sessions',
      ...FACTORS.map(f => `delete:${f}`),
      'revoke',
      'completed',
      'notify',
    ]);
    for (const type of FACTORS) {
      expect(kratos.deleteIdentityCredential).toHaveBeenCalledWith(
        TARGET.authenticationID,
        type,
        { timeoutMs: 5000 }
      );
    }
    expect(kratos.invalidateAllIdentitySessions).toHaveBeenCalledWith(
      TARGET.authenticationID,
      { timeoutMs: 5000 }
    );
    const correlationId = correlationIdOf(audit.recordResetStarted);
    expect(revocation.revokeAllForSub).toHaveBeenCalledWith(
      TARGET.authenticationID,
      'second_factor_reset',
      { correlationId }
    );
    expect(audit.recordResetStarted).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: TARGET.id }),
      {
        kratosIdentityId: TARGET.authenticationID,
        correlationId,
        invalidatePassword: false,
      }
    );
    expect(audit.recordResetCompleted).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: TARGET.id }),
      {
        kratosIdentityId: TARGET.authenticationID,
        correlationId,
        removedCredentialTypes: FACTORS,
        sessionsRevoked: 2,
        tokenRevocationFailedCount: 0,
        passwordInvalidated: false,
      }
    );
    expect(observer.notify).toHaveBeenCalledWith(
      expect.objectContaining({ id: TARGET.id, email: TARGET.email }),
      expect.any(String),
      correlationId
    );
    expect(kratos.replacePasswordWithUnusableSecret).not.toHaveBeenCalled();
    expect(result).toEqual({
      removedCredentialTypes: FACTORS,
      sessionsRevoked: 2,
      passwordInvalidated: false,
    });
  });

  describe('with invalidatePassword', () => {
    const completedDetails = (audit: {
      recordResetCompleted: { mock: { calls: unknown[][] } };
    }) =>
      audit.recordResetCompleted.mock.calls[0]?.[2] as Record<string, unknown>;

    it('replaces the password before the removals and again after the second pass, and records the second time', async () => {
      const { service, calls, kratos, audit } = build();

      const result = await service.resetSecondFactor(admin, TARGET.id, true);

      expect(calls).toEqual([
        'started',
        'password',
        ...FACTORS.map(f => `delete:${f}`),
        'kratos-sessions',
        ...FACTORS.map(f => `delete:${f}`),
        'password',
        'revoke',
        'completed',
        'notify',
      ]);
      expect(kratos.replacePasswordWithUnusableSecret).toHaveBeenCalledTimes(2);
      for (const call of kratos.replacePasswordWithUnusableSecret.mock
        .calls as unknown[][]) {
        expect(call).toEqual([TARGET.authenticationID, { timeoutMs: 5000 }]);
      }
      expect(
        (audit.recordResetStarted.mock.calls[0] as unknown[])[2]
      ).toMatchObject({ invalidatePassword: true });
      const completed = completedDetails(audit);
      expect(completed).toMatchObject({
        passwordInvalidated: true,
        passwordLastChangedAt: 'password-time-2',
      });
      expect(
        JSON.stringify(audit.recordResetCompleted.mock.calls)
      ).not.toContain('password-time-1');
      expect(result.passwordInvalidated).toBe(true);
    });

    it.each([
      ['neither replacement found a password', [null, null], false, undefined],
      [
        'only the second found one, set in between',
        [null, { lastChangedAt: 'later' }],
        true,
        'later',
      ],
      [
        'the first replaced one and the second found none',
        [{ lastChangedAt: 'first' }, null],
        true,
        undefined,
      ],
      [
        'the second read carried no time',
        [{ lastChangedAt: 'first' }, { lastChangedAt: undefined }],
        true,
        undefined,
      ],
    ])('when %s, records passwordInvalidated and its time from the second replacement', async (_label, answers, invalidated, time) => {
      const { service, audit, kratos } = build({
        replacePassword: async call => answers[call - 1] ?? null,
      });

      await service.resetSecondFactor(admin, TARGET.id, true);

      expect(kratos.replacePasswordWithUnusableSecret).toHaveBeenCalledTimes(2);
      const completed = completedDetails(audit);
      expect(completed.passwordInvalidated).toBe(invalidated);
      if (time === undefined) {
        expect('passwordLastChangedAt' in completed).toBe(false);
      } else {
        expect(completed.passwordLastChangedAt).toBe(time);
      }
    });

    it.each([
      ['a timeout', timeoutError(), 'timeout'],
      ['an HTTP error', httpError(500), 'http_500'],
    ])('records kratos_password on %s of the first replacement and touches nothing else', async (_label, failure, reason) => {
      const { service, audit, kratos, revocation, observer } = build({
        replacePassword: () => Promise.reject(failure),
      });

      await expect(
        service.resetSecondFactor(admin, TARGET.id, true)
      ).rejects.toMatchObject({ details: { failedStep: 'kratos_password' } });

      expect(audit.recordResetFailed).toHaveBeenCalledWith(
        admin,
        expect.anything(),
        expect.objectContaining({
          failedStep: 'kratos_password',
          failureReason: reason,
        })
      );
      expect(kratos.deleteIdentityCredential).not.toHaveBeenCalled();
      expect(kratos.invalidateAllIdentitySessions).not.toHaveBeenCalled();
      expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
      expect(observer.notify).not.toHaveBeenCalled();
    });

    it('records kratos_password when the second replacement fails, with no revocation and no completed row', async () => {
      const { service, audit, revocation, observer } = build({
        replacePassword: async call => {
          if (call === 2) throw timeoutError();
          return { lastChangedAt: 'first' };
        },
      });

      await expect(
        service.resetSecondFactor(admin, TARGET.id, true)
      ).rejects.toMatchObject({ details: { failedStep: 'kratos_password' } });

      expect(audit.recordResetFailed).toHaveBeenCalledWith(
        admin,
        expect.anything(),
        expect.objectContaining({
          failedStep: 'kratos_password',
          failureReason: 'timeout',
        })
      );
      expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
      expect(audit.recordResetCompleted).not.toHaveBeenCalled();
      expect(observer.notify).not.toHaveBeenCalled();
    });

    it('does not replace the password again when the second removal pass fails', async () => {
      let deletes = 0;
      const { service, audit, kratos, revocation } = build({
        deleteCredential: async () => {
          deletes += 1;
          if (deletes === 4) throw httpError(502);
          return true;
        },
      });

      await expect(
        service.resetSecondFactor(admin, TARGET.id, true)
      ).rejects.toMatchObject({
        details: { failedStep: 'kratos_credentials' },
      });

      expect(kratos.replacePasswordWithUnusableSecret).toHaveBeenCalledTimes(1);
      expect(audit.recordResetFailed).toHaveBeenCalledWith(
        admin,
        expect.anything(),
        expect.objectContaining({ failedStep: 'kratos_credentials' })
      );
      expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
    });

    it('logs only the message of a failed replacement, never the error object', async () => {
      const failure = Object.assign(new Error('Request failed'), {
        response: { status: 500 },
        config: { data: '{"password":"leaked-secret"}' },
      });
      const { service, logger } = build({
        replacePassword: () => Promise.reject(failure),
      });

      await expect(
        service.resetSecondFactor(admin, TARGET.id, true)
      ).rejects.toThrow();

      const logged = JSON.stringify(logger.error.mock.calls);
      expect(logged).toContain('Request failed');
      expect(logged).not.toContain('leaked-secret');
    });
  });

  it('lists a type once when only the first pass removed it, and lists one only the second pass removed', async () => {
    let pass = 0;
    const { service, audit } = build({
      deleteCredential: async (_id, type) => {
        if (type === 'totp') pass += 1;
        if (type === 'totp') return pass === 1;
        if (type === 'webauthn') return pass === 2;
        return false;
      },
    });

    await service.resetSecondFactor(admin, TARGET.id, false);

    const completed = (audit.recordResetCompleted.mock.calls[0] as any[])[2];
    expect(completed.removedCredentialTypes).toEqual(['totp', 'webauthn']);
  });

  it('completes with nothing removed for an identity Kratos no longer holds', async () => {
    const { service, audit } = build({
      deleteCredential: async () => false,
      invalidateSessions: async () => {},
    });

    await service.resetSecondFactor(admin, TARGET.id, false);

    expect(
      (audit.recordResetCompleted.mock.calls[0] as any[])[2]
        .removedCredentialTypes
    ).toEqual([]);
  });

  it('touches nothing when the intent row cannot be written', async () => {
    const { service, kratos, revocation } = build({
      recordStarted: () => Promise.reject(new Error('db down')),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow('db down');
    expect(kratos.deleteIdentityCredential).not.toHaveBeenCalled();
    expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
  });

  it.each([
    ['a timeout', timeoutError(), 'timeout'],
    ['an HTTP error', httpError(500), 'http_500'],
    ['an unknown error', new Error('boom'), 'unknown'],
  ])('records kratos_credentials on %s of a removal and goes no further', async (_label, failure, reason) => {
    const { service, audit, kratos, revocation, logger, observer } = build({
      deleteCredential: async (_id, type) => {
        if (type === 'webauthn') throw failure;
        return true;
      },
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toMatchObject({ details: { failedStep: 'kratos_credentials' } });

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: TARGET.id }),
      expect.objectContaining({
        failedStep: 'kratos_credentials',
        failureReason: reason,
        correlationId: correlationIdOf(audit.recordResetStarted),
      })
    );
    expect(kratos.invalidateAllIdentitySessions).not.toHaveBeenCalled();
    expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
    expect(audit.recordResetCompleted).not.toHaveBeenCalled();
    expect(observer.notify).not.toHaveBeenCalled();
    const failedRow = JSON.stringify(audit.recordResetFailed.mock.calls[0]);
    expect(failedRow).not.toContain(failure.message);
    expect(JSON.stringify(logger.error.mock.calls)).toContain(failure.message);
  });

  it('logs the failed step and its cause even when the failure row cannot be written', async () => {
    const { service, logger } = build({
      invalidateSessions: () => Promise.reject(httpError(503)),
      recordFailed: () => Promise.reject(new Error('audit store down')),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow('audit store down');

    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain('kratos_sessions');
    expect(logged).toContain('http_503');
    expect(logged).toContain('Request failed with status code 503');
  });

  it('records kratos_sessions when the session invalidation fails, with what was already removed, and revokes nothing', async () => {
    const { service, audit, revocation } = build({
      deleteCredential: async (_id, type) => type !== 'webauthn',
      invalidateSessions: () => Promise.reject(httpError(503)),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, true)
    ).rejects.toThrow();

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.anything(),
      expect.objectContaining({
        failedStep: 'kratos_sessions',
        failureReason: 'http_503',
        removedCredentialTypes: ['totp', 'lookup_secret'],
        passwordInvalidated: true,
      })
    );
    expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
  });

  it('records the removals of a pass that failed part-way', async () => {
    const { service, audit } = build({
      deleteCredential: async (_id, type) => {
        if (type === 'webauthn') throw timeoutError();
        return true;
      },
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow();

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.anything(),
      expect.objectContaining({
        failedStep: 'kratos_credentials',
        removedCredentialTypes: ['totp'],
        passwordInvalidated: false,
      })
    );
  });

  it('records kratos_credentials when the second removal pass fails, and revokes nothing', async () => {
    let calls = 0;
    const { service, audit, revocation } = build({
      deleteCredential: async () => {
        calls += 1;
        if (calls === 4) throw timeoutError();
        return true;
      },
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow();

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.anything(),
      expect.objectContaining({
        failedStep: 'kratos_credentials',
        failureReason: 'timeout',
      })
    );
    expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
  });

  it.each([
    [
      'sessions that may still be alive',
      { failedCount: 1 },
      'sessions_incomplete',
    ],
    [
      'no subject marker',
      { failedCount: 0, subjectMarked: false },
      'marker_not_written',
    ],
  ])('records application_sessions for %s, never completed', async (_label, overrides, reason) => {
    const { service, audit, observer } = build({
      revoke: async () => report(overrides),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow();

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.anything(),
      expect.objectContaining({
        failedStep: 'application_sessions',
        failureReason: reason,
      })
    );
    expect(audit.recordResetCompleted).not.toHaveBeenCalled();
    expect(observer.notify).not.toHaveBeenCalled();
  });

  it('completes and carries failed token revocations', async () => {
    const { service, audit } = build({
      revoke: async () => report({ tokenRevocationFailedCount: 2 }),
    });

    await service.resetSecondFactor(admin, TARGET.id, false);

    expect(
      (audit.recordResetCompleted.mock.calls[0] as any[])[2]
        .tokenRevocationFailedCount
    ).toBe(2);
  });

  it('still sends the notice when the completion row fails, then fails', async () => {
    const { service, observer } = build({
      recordCompleted: () => Promise.reject(new Error('audit write failed')),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).rejects.toThrow('audit write failed');
    expect(observer.notify).toHaveBeenCalledTimes(1);
  });

  it('does not fail a completed reset when the notice fails', async () => {
    const { service, audit } = build({
      notify: () => Promise.reject(new Error('broker down')),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id, false)
    ).resolves.toBeDefined();
    expect(audit.recordResetFailed).not.toHaveBeenCalled();
  });
});
