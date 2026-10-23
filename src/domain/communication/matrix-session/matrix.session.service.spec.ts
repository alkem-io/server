import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatrixSessionService } from './matrix.session.service';

/**
 * workspace#091, FR-009/FR-010. Also the `writeSucceedsSpec` /
 * `writeFailsSpec` that `AUDIT_WRITER_COVERAGE[MATRIX_SESSION]` points at
 * (`unit.coverage.inventory.ts`): case 1 is the write-succeeds proof, case 3
 * the write-fails one.
 */
describe('MatrixSessionService', () => {
  const ACTOR_ID = 'actor-uuid-123';
  const MINTED = {
    userId: '@actor-uuid-123:matrix.host',
    deviceId: 'DEV1',
    accessToken: 'syt_live_token',
  };

  let auditRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let communicationAdapter: { createActorSession: ReturnType<typeof vi.fn> };
  let logger: { error: ReturnType<typeof vi.fn> };
  let service: MatrixSessionService;

  beforeEach(() => {
    auditRepository = {
      create: vi.fn(row => row),
      save: vi.fn().mockResolvedValue(undefined),
    };
    communicationAdapter = {
      createActorSession: vi.fn().mockResolvedValue({ ...MINTED }),
    };
    logger = { error: vi.fn() };
    service = new MatrixSessionService(
      auditRepository as any,
      communicationAdapter as any,
      logger as any
    );
  });

  it('writes exactly one audit row and returns the credential unchanged', async () => {
    const result = await service.mintForActor(ACTOR_ID);

    expect(result).toEqual(MINTED);
    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    expect(auditRepository.save).toHaveBeenCalledWith({
      category: PlatformAuditCategory.MATRIX_SESSION,
      subjectUserId: ACTOR_ID,
      initiatorUserId: ACTOR_ID,
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.KEY_MINTED,
      details: { deviceId: 'DEV1' },
    });
  });

  it('never puts the minted token anywhere in the audit row', async () => {
    await service.mintForActor(ACTOR_ID);

    const row = auditRepository.save.mock.calls[0][0];
    expect(JSON.stringify(row)).not.toContain(MINTED.accessToken);
    expect(Object.keys(row.details)).toEqual(['deviceId']);
  });

  it('fails closed: an audit write failure throws and returns no credential (FR-010)', async () => {
    auditRepository.save.mockRejectedValue(new Error('audit table gone'));

    await expect(service.mintForActor(ACTOR_ID)).rejects.toThrow(
      'audit table gone'
    );
    // The orphaned device id is logged so the mint can be reconciled (R-4).
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('DEV1'),
      expect.anything(),
      expect.anything()
    );
  });

  it('propagates an adapter failure without writing an audit row', async () => {
    communicationAdapter.createActorSession.mockRejectedValue(
      new Error('matrix unreachable')
    );

    await expect(service.mintForActor(ACTOR_ID)).rejects.toThrow(
      'matrix unreachable'
    );
    expect(auditRepository.save).not.toHaveBeenCalled();
  });
});
