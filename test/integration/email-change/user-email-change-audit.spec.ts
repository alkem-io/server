import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformAuditInitiatorRole } from '@src/domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@src/domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@src/domain/community/user-email-change/platform.audit.entry.entity';
import { UserEmailChangeService } from '@src/domain/community/user-email-change/user.email.change.service';
import { AdminUserEmailChangeResolverFields } from '@src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Integration — audit query surface (Scenario 5)', () => {
  let resolver: AdminUserEmailChangeResolverFields;
  let userEmailChangeService: any;
  let userLookupService: any;
  let authorizationService: any;
  let platformAuthorizationPolicyService: any;

  const actorContext = { actorID: 'admin-1' } as unknown as ActorContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    userEmailChangeService = {
      getLatestAuditEntryForSubject: vi.fn(),
      getAuditEntriesForSubject: vi.fn(),
    };
    userLookupService = {
      getUserByIdOrFail: vi.fn(async (id: string) => ({
        id,
        profile: { displayName: id === 'admin-1' ? 'Polly' : 'Alice' },
      })),
    };
    authorizationService = { grantAccessOrFail: vi.fn() };
    platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue({}),
    };
    resolver = new AdminUserEmailChangeResolverFields(
      authorizationService as unknown as AuthorizationService,
      platformAuthorizationPolicyService as unknown as PlatformAuthorizationPolicyService,
      userEmailChangeService as unknown as UserEmailChangeService,
      userLookupService as unknown as UserLookupService
    );
  });

  const makeRow = (
    outcome: PlatformAuditOutcome,
    overrides: Partial<PlatformAuditEntry> = {}
  ): PlatformAuditEntry =>
    ({
      id: `row-${outcome}`,
      rowId: 1,
      subjectUserId: 'alice-id',
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome,
      details: { oldEmail: 'old@e.com', newEmail: 'new@e.com' },
      createdDate: new Date('2026-05-13T12:00:00Z'),
      failureReason: undefined,
      ...overrides,
    }) as PlatformAuditEntry;

  it('latestUserEmailChangeAuditEntry returns null when no audit rows exist', async () => {
    userEmailChangeService.getLatestAuditEntryForSubject.mockResolvedValue(
      null
    );
    const result = await resolver.latestUserEmailChangeAuditEntry(
      actorContext,
      'alice-id'
    );
    expect(result).toBeNull();
  });

  it('latestUserEmailChangeAuditEntry projects the row with resolved profiles', async () => {
    userEmailChangeService.getLatestAuditEntryForSubject.mockResolvedValue(
      makeRow(PlatformAuditOutcome.COMMITTED)
    );
    const result = await resolver.latestUserEmailChangeAuditEntry(
      actorContext,
      'alice-id'
    );
    expect(result).toBeDefined();
    expect(result!.subject).toEqual({ id: 'alice-id', displayName: 'Alice' });
    expect(result!.initiator).toEqual({ id: 'admin-1', displayName: 'Polly' });
    expect(result!.outcome).toBe('committed');
    expect(result!.oldEmail).toBe('old@e.com');
    expect(result!.newEmail).toBe('new@e.com');
  });

  it('userEmailChangeAuditEntries projects every outcome and exposes pagination', async () => {
    const outcomes = [
      PlatformAuditOutcome.COMMITTED,
      PlatformAuditOutcome.REJECTED_VALIDATION,
      PlatformAuditOutcome.REJECTED_CONFLICT,
      PlatformAuditOutcome.ROLLED_BACK,
      PlatformAuditOutcome.DRIFT_DETECTED,
      PlatformAuditOutcome.DRIFT_RESOLVED,
    ];
    const rows = outcomes.map((o, i) =>
      makeRow(o, {
        id: `row-${i}`,
        rowId: outcomes.length - i,
        failureReason:
          o === PlatformAuditOutcome.REJECTED_CONFLICT ? 'conflict' : undefined,
      })
    );
    userEmailChangeService.getAuditEntriesForSubject.mockResolvedValue({
      entries: rows,
      total: rows.length,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'a',
      endCursor: 'b',
    });

    const result = await resolver.userEmailChangeAuditEntries(
      actorContext,
      'alice-id',
      undefined,
      50
    );
    expect(result.auditEntries.length).toBe(outcomes.length);
    expect(result.total).toBe(outcomes.length);

    // Conflict entry's failureReason is non-leaky and does NOT reference any user identifier.
    const conflictEntry = result.auditEntries.find(
      e => e.outcome === 'rejected_conflict'
    );
    expect(conflictEntry?.failureReason).toBe('conflict');
    expect(conflictEntry?.failureReason).not.toMatch(/bob|alice/i);

    // Subject + initiator carry only {id, displayName} — no email field.
    for (const entry of result.auditEntries) {
      expect(Object.keys(entry.subject).sort()).toEqual(['displayName', 'id']);
      if (entry.initiator) {
        expect(Object.keys(entry.initiator).sort()).toEqual([
          'displayName',
          'id',
        ]);
      }
    }
  });

  it('sentinel-initiator entry returns initiator: undefined with initiatorRole still set', async () => {
    userEmailChangeService.getAuditEntriesForSubject.mockResolvedValue({
      entries: [
        makeRow(PlatformAuditOutcome.REJECTED_VALIDATION, {
          initiatorUserId: undefined,
        }),
      ],
      total: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    const result = await resolver.userEmailChangeAuditEntries(
      actorContext,
      'alice-id'
    );
    expect(result.auditEntries[0].initiator).toBeUndefined();
    expect(result.auditEntries[0].initiatorRole).toBe('platform_admin');
  });
});
