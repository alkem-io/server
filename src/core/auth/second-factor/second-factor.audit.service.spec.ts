import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { SecondFactorAuditService } from './second-factor.audit.service';

const RESET_DETAIL_KEYS = [
  'failedStep',
  'invalidatePassword',
  'kratosIdentityId',
  'passwordInvalidated',
  'passwordLastChangedAt',
  'removedCredentialTypes',
  'sessionsRevoked',
  'tokenRevocationFailedCount',
];

function makeManager() {
  const saved: any[] = [];
  return {
    saved,
    create: vi.fn((_entity: unknown, row: any) => ({ ...row })),
    save: vi.fn(async (row: any) => {
      saved.push(row);
      return row;
    }),
  };
}

const actorWith = (...types: string[]) =>
  Object.assign(new ActorContext(), {
    actorID: 'actor-1',
    credentials: types.map(type => ({ type, resourceID: '' })),
  });

describe('SecondFactorAuditService', () => {
  let service: SecondFactorAuditService;
  let defaultManager: ReturnType<typeof makeManager>;

  beforeEach(async () => {
    defaultManager = makeManager();
    const module = await Test.createTestingModule({
      providers: [
        SecondFactorAuditService,
        { provide: getEntityManagerToken(), useValue: defaultManager },
      ],
    }).compile();
    service = module.get(SecondFactorAuditService);
  });

  describe('recordRuleTransition', () => {
    it('writes a platform transition in the given manager, attributed to the settings admin role', async () => {
      const tx = makeManager();

      await service.recordRuleTransition(
        tx as any,
        actorWith(AuthorizationCredential.PLATFORM_SETTINGS_ADMIN),
        {
          scope: 'platform',
          from: false,
          to: true,
          since: '2026-11-01T10:00:00.000Z',
        }
      );

      expect(defaultManager.save).not.toHaveBeenCalled();
      expect(tx.saved).toEqual([
        {
          category: PlatformAuditCategory.AUTHENTICATION,
          outcome: PlatformAuditOutcome.CONFIGURATION_CHANGED,
          initiatorUserId: 'actor-1',
          initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SETTINGS_ADMIN,
          subjectOrganizationId: undefined,
          details: {
            scope: 'platform',
            from: false,
            to: true,
            since: '2026-11-01T10:00:00.000Z',
          },
        },
      ]);
    });

    it("attributes an organisation's own admin as self, and throws nothing", async () => {
      const tx = makeManager();

      await service.recordRuleTransition(
        tx as any,
        actorWith(AuthorizationCredential.ORGANIZATION_ADMIN),
        {
          scope: 'organization',
          organizationId: 'org-1',
          from: false,
          to: true,
          since: '2026-11-01T10:00:00.000Z',
        }
      );

      expect(tx.saved[0]).toMatchObject({
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        subjectOrganizationId: 'org-1',
        details: { scope: 'organization', organizationId: 'org-1' },
      });
    });

    it('attributes a Platform Content Full Access holder to that role', async () => {
      const tx = makeManager();

      await service.recordRuleTransition(
        tx as any,
        actorWith(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS),
        {
          scope: 'organization',
          organizationId: 'org-1',
          from: true,
          to: false,
          since: '2026-11-01T10:00:00.000Z',
        }
      );

      expect(tx.saved[0].initiatorRole).toBe(
        PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS
      );
    });

    it('rejects when the write fails', async () => {
      const tx = makeManager();
      tx.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.recordRuleTransition(
          tx as any,
          actorWith(AuthorizationCredential.PLATFORM_SETTINGS_ADMIN),
          { scope: 'platform', from: false, to: true, since: null }
        )
      ).rejects.toThrow('db down');
    });
  });

  describe('reset rows', () => {
    const support = actorWith(AuthorizationCredential.PLATFORM_SUPPORT);
    const target = { id: 'user-2', email: 'x@example.com', nameID: 'x' };
    const ids = { kratosIdentityId: 'kratos-2', correlationId: 'corr-1' };

    it('writes the intent row with only allow-listed keys', async () => {
      await service.recordResetStarted(support, target, {
        ...ids,
        invalidatePassword: true,
      });

      const row = defaultManager.saved[0];
      expect(row).toMatchObject({
        category: PlatformAuditCategory.AUTHENTICATION,
        outcome: PlatformAuditOutcome.SECOND_FACTOR_RESET_STARTED,
        subjectUserId: 'user-2',
        initiatorUserId: 'actor-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SUPPORT,
        correlationId: 'corr-1',
        details: { kratosIdentityId: 'kratos-2', invalidatePassword: true },
      });
      expect(JSON.stringify(row)).not.toContain('x@example.com');
    });

    it('carries passwordLastChangedAt unchanged on a completed row, and no such key without it', async () => {
      const users = actorWith(AuthorizationCredential.PLATFORM_USERS_ADMIN);
      const base = {
        ...ids,
        removedCredentialTypes: ['totp'],
        sessionsRevoked: 2,
        tokenRevocationFailedCount: 0,
        passwordInvalidated: true,
      };

      await service.recordResetCompleted(users, target, {
        ...base,
        passwordLastChangedAt: '2026-11-11T10:00:00.123456789Z',
      });
      await service.recordResetCompleted(users, target, base);

      const [withTime, without] = defaultManager.saved;
      expect(withTime.initiatorRole).toBe(
        PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN
      );
      expect(withTime.details.passwordLastChangedAt).toBe(
        '2026-11-11T10:00:00.123456789Z'
      );
      expect('passwordLastChangedAt' in without.details).toBe(false);
      for (const row of defaultManager.saved) {
        expect(
          Object.keys(row.details).every(k => RESET_DETAIL_KEYS.includes(k))
        ).toBe(true);
      }
    });

    it('writes a failed row with its closed-set reason', async () => {
      await service.recordResetFailed(support, target, {
        ...ids,
        failedStep: 'kratos_credentials',
        failureReason: 'http_500',
      });

      expect(defaultManager.saved[0]).toMatchObject({
        outcome: PlatformAuditOutcome.SECOND_FACTOR_RESET_FAILED,
        failureReason: 'http_500',
        details: {
          kratosIdentityId: 'kratos-2',
          failedStep: 'kratos_credentials',
        },
      });
    });

    it('rejects a reason outside the closed set at compile time', () => {
      const write = () =>
        service.recordResetFailed(support, target, {
          ...ids,
          failedStep: 'kratos_sessions',
          // @ts-expect-error raw error text is not a failure reason
          failureReason: 'connect ECONNREFUSED 10.0.0.1:4434',
        });
      expect(write).toBeDefined();
    });

    it('rejects when the write fails', async () => {
      defaultManager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.recordResetStarted(support, target, {
          ...ids,
          invalidatePassword: false,
        })
      ).rejects.toThrow('db down');
    });
  });

  describe('a member’s own change', () => {
    const member = { id: 'user-3', email: 'member@example.com' };

    it('writes an observed row with only the allow-listed keys and no address', async () => {
      await service.recordFactorChange(member, {
        method: 'totp',
        observedAt: '2026-11-11T10:00:00.000Z',
        sourceFlowId: 'flow-1',
        requestContext: { userAgent: 'Firefox', ip: '10.0.0.1' } as any,
        correlationId: 'corr-2',
      });

      const row = defaultManager.saved[0];
      expect(row).toMatchObject({
        category: PlatformAuditCategory.AUTHENTICATION,
        outcome: PlatformAuditOutcome.OBSERVED,
        subjectUserId: 'user-3',
        initiatorUserId: 'user-3',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        correlationId: 'corr-2',
      });
      expect(row.details).toEqual({
        method: 'totp',
        observedAt: '2026-11-11T10:00:00.000Z',
        sourceFlowId: 'flow-1',
        requestContext: { userAgent: 'Firefox' },
      });
      expect(JSON.stringify(row)).not.toContain('member@example.com');
    });

    it('writes a signal-failed row', async () => {
      await service.recordSignalFailed(member, {
        failureReason: 'timeout',
        correlationId: 'corr-3',
      });

      expect(defaultManager.saved[0]).toMatchObject({
        outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
        failureReason: 'timeout',
        correlationId: 'corr-3',
        subjectUserId: 'user-3',
      });
    });

    it('rejects when the write fails', async () => {
      defaultManager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.recordFactorChange(member, {
          method: 'webauthn',
          observedAt: '2026-11-11T10:00:00.000Z',
          correlationId: 'corr-4',
        })
      ).rejects.toThrow('db down');
    });
  });
});
