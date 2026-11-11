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
    notify?: () => Promise<void>;
  } = {}
) {
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
    }),
    recordResetFailed: vi.fn(async () => {
      calls.push('failed');
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
      service.resetSecondFactor(admin, TARGET.id)
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(audit.recordResetStarted).not.toHaveBeenCalled();
    expect(kratos.deleteIdentityCredential).not.toHaveBeenCalled();
  });

  it('refuses the admin’s own account with self_target, before any row', async () => {
    const { service, audit } = build();

    const error = await service
      .resetSecondFactor(admin, ADMIN_ID)
      .catch(e => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.details).toMatchObject({ reason: 'self_target' });
    expect(audit.recordResetStarted).not.toHaveBeenCalled();
  });

  it('runs in order: intent, removals, Kratos sessions, removals again, revocation, outcome, notice', async () => {
    const { service, calls, kratos, revocation, audit, observer } = build();

    const result = await service.resetSecondFactor(admin, TARGET.id);

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
    expect(result).toEqual({
      removedCredentialTypes: FACTORS,
      sessionsRevoked: 2,
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

    await service.resetSecondFactor(admin, TARGET.id);

    const completed = (audit.recordResetCompleted.mock.calls[0] as any[])[2];
    expect(completed.removedCredentialTypes).toEqual(['totp', 'webauthn']);
  });

  it('completes with nothing removed for an identity Kratos no longer holds', async () => {
    const { service, audit } = build({
      deleteCredential: async () => false,
      invalidateSessions: async () => {},
    });

    await service.resetSecondFactor(admin, TARGET.id);

    expect(
      (audit.recordResetCompleted.mock.calls[0] as any[])[2]
        .removedCredentialTypes
    ).toEqual([]);
  });

  it('touches nothing when the intent row cannot be written', async () => {
    const { service, kratos, revocation } = build({
      recordStarted: () => Promise.reject(new Error('db down')),
    });

    await expect(service.resetSecondFactor(admin, TARGET.id)).rejects.toThrow(
      'db down'
    );
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
      service.resetSecondFactor(admin, TARGET.id)
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

  it('records kratos_sessions when the session invalidation fails, and revokes nothing', async () => {
    const { service, audit, revocation } = build({
      invalidateSessions: () => Promise.reject(httpError(503)),
    });

    await expect(service.resetSecondFactor(admin, TARGET.id)).rejects.toThrow();

    expect(audit.recordResetFailed).toHaveBeenCalledWith(
      admin,
      expect.anything(),
      expect.objectContaining({
        failedStep: 'kratos_sessions',
        failureReason: 'http_503',
      })
    );
    expect(revocation.revokeAllForSub).not.toHaveBeenCalled();
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

    await expect(service.resetSecondFactor(admin, TARGET.id)).rejects.toThrow();

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

    await expect(service.resetSecondFactor(admin, TARGET.id)).rejects.toThrow();

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

    await service.resetSecondFactor(admin, TARGET.id);

    expect(
      (audit.recordResetCompleted.mock.calls[0] as any[])[2]
        .tokenRevocationFailedCount
    ).toBe(2);
  });

  it('does not fail a completed reset when the notice fails', async () => {
    const { service, audit } = build({
      notify: () => Promise.reject(new Error('broker down')),
    });

    await expect(
      service.resetSecondFactor(admin, TARGET.id)
    ).resolves.toBeDefined();
    expect(audit.recordResetFailed).not.toHaveBeenCalled();
  });
});
