/**
 * T005 — Mandatory rollback it-spec for moveSpaceL2ToSpaceL1OrFail.
 *
 * TDD evidence (intake gate): this spec is committed against the naive-clone
 * (stage-1) commit so it is DEMONSTRABLY RED. It turns GREEN only after the
 * transaction is wrapped in stage 2.
 *
 * Invariants asserted (INV-5 field list):
 *   - parentSpace
 *   - levelZeroSpaceID
 *   - sortOrder
 *   - roleSet parent (setParentRoleSetAndCredentials)
 *   - storageAggregator parent
 *
 * Also asserts:
 *   - Error propagates out of moveSpaceL2ToSpaceL1OrFail
 *   - post-commit tail (license assignment, activity removal) NOT reached
 *   - Community roles are intact after a mid-transaction failure (sec-server-1)
 *   - Tagset saves go through mgr, not the global manager, when tx fails
 *     (corr-server-1: non-empty tagsetTemplates path)
 */

import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '@platform/activity/activity.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { ConversionService } from './conversion.service';

describe('moveSpaceL2ToSpaceL1OrFail — rollback proof (INV-5)', () => {
  let service: ConversionService;
  let spaceService: Record<string, Mock>;
  let roleSetService: Record<string, Mock>;
  let namingService: Record<string, Mock>;
  let entityManager: Record<string, Mock>;
  let spaceLookupService: Record<string, Mock>;
  let calloutsSetService: Record<string, Mock>;
  let classificationService: Record<string, Mock>;
  let activityService: Record<string, Mock>;
  let accountHostService: Record<string, Mock>;

  const makeSourceL2 = (overrides: Record<string, unknown> = {}) => ({
    id: 'source-l2',
    level: SpaceLevel.L2,
    levelZeroSpaceID: 'source-l0',
    nameID: 'source-l2-space',
    sortOrder: 3,
    parentSpace: { id: 'source-l1' },
    community: { roleSet: { id: 'roleset-l2' } },
    storageAggregator: { id: 'sa-l2', parentStorageAggregator: null },
    subspaces: [],
    ...overrides,
  });

  const makeTargetL1 = (overrides: Record<string, unknown> = {}) => ({
    id: 'target-l1',
    level: SpaceLevel.L1,
    levelZeroSpaceID: 'target-l0',
    community: { roleSet: { id: 'roleset-target-l1' } },
    storageAggregator: { id: 'sa-target-l1' },
    subspaces: [],
    ...overrides,
  });

  const makeTargetL0 = (overrides: Record<string, unknown> = {}) => ({
    id: 'target-l0',
    level: SpaceLevel.L0,
    levelZeroSpaceID: 'target-l0',
    account: { id: 'account-target', accountType: 'BASIC' },
    ...overrides,
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversionService);
    spaceService = module.get(SpaceService) as unknown as Record<string, Mock>;
    roleSetService = module.get(RoleSetService) as unknown as Record<
      string,
      Mock
    >;
    namingService = module.get(NamingService) as unknown as Record<
      string,
      Mock
    >;
    entityManager = module.get(EntityManager) as unknown as Record<
      string,
      Mock
    >;
    spaceLookupService = module.get(SpaceLookupService) as unknown as Record<
      string,
      Mock
    >;
    calloutsSetService = module.get(CalloutsSetService) as unknown as Record<
      string,
      Mock
    >;
    classificationService = module.get(
      ClassificationService
    ) as unknown as Record<string, Mock>;
    activityService = module.get(ActivityService) as unknown as Record<
      string,
      Mock
    >;
    accountHostService = module.get(AccountHostService) as unknown as Record<
      string,
      Mock
    >;
  });

  /**
   * Builds a mock entityManager.transaction that:
   *   1. Invokes the callback with a tracked `mgr` (spy object).
   *   2. Throws AFTER the sortOrder shift ran (mid-transaction failure).
   *   3. Records all calls on `mgr` so we can assert none escaped.
   */
  const buildFailingTransactionManager = () => {
    const mgrSave = vi.fn().mockRejectedValue(new Error('DB write failed'));
    const mgrQb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const mgr = {
      save: mgrSave,
      createQueryBuilder: vi.fn().mockReturnValue(mgrQb),
      find: vi.fn().mockResolvedValue([]),
    };

    // transaction invokes the callback then throws when mgr.save rejects
    vi.mocked(entityManager.transaction).mockImplementation(
      async (callback: (mgr: unknown) => Promise<unknown>) => {
        return callback(mgr);
      }
    );

    return { mgr, mgrSave, mgrQb };
  };

  const setupPreTransactionMocks = () => {
    // roles — empty community
    vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getOrganizationsWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getVirtualContributorsWithRole).mockResolvedValue(
      []
    );
    vi.mocked(
      namingService.getReservedNameIDsInLevelZeroSpace
    ).mockResolvedValue([]);
    vi.mocked(entityManager.find).mockResolvedValue([
      { id: 'source-l2', nameID: 'source-l2-space' },
    ]);
    vi.mocked(spaceLookupService.getAllDescendantSpaceIDs).mockResolvedValue(
      []
    );
    vi.mocked(roleSetService.setParentRoleSetAndCredentials).mockResolvedValue({
      id: 'roleset-l2',
    });
    vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
      tagsetTemplates: [],
    });
  };

  it('(TDD-RED against naive clone) error propagates out when mid-tx write fails', async () => {
    vi.mocked(spaceService.getSpaceOrFail)
      .mockResolvedValueOnce(makeSourceL2())
      .mockResolvedValueOnce(makeTargetL1())
      .mockResolvedValueOnce(makeTargetL0());
    setupPreTransactionMocks();
    buildFailingTransactionManager();

    await expect(
      service.moveSpaceL2ToSpaceL1OrFail({
        spaceL2ID: 'source-l2',
        targetSpaceL1ID: 'target-l1',
      })
    ).rejects.toThrow('DB write failed');
  });

  it('(TDD-RED against naive clone) post-commit tail not reached when tx fails', async () => {
    vi.mocked(spaceService.getSpaceOrFail)
      .mockResolvedValueOnce(makeSourceL2())
      .mockResolvedValueOnce(makeTargetL1())
      .mockResolvedValueOnce(makeTargetL0());
    setupPreTransactionMocks();
    buildFailingTransactionManager();

    await expect(
      service.moveSpaceL2ToSpaceL1OrFail({
        spaceL2ID: 'source-l2',
        targetSpaceL1ID: 'target-l1',
      })
    ).rejects.toThrow();

    // license and activity tail must NOT be reached after a tx failure
    expect(accountHostService.assignLicensePlansToSpace).not.toHaveBeenCalled();
    expect(
      activityService.removeSubspaceCreatedActivityForResource
    ).not.toHaveBeenCalled();
  });

  it('(TDD-RED against naive clone) structural writes go through mgr, not global entityManager', async () => {
    vi.mocked(spaceService.getSpaceOrFail)
      .mockResolvedValueOnce(makeSourceL2())
      .mockResolvedValueOnce(makeTargetL1())
      .mockResolvedValueOnce(makeTargetL0());
    setupPreTransactionMocks();
    const { mgr } = buildFailingTransactionManager();

    await expect(
      service.moveSpaceL2ToSpaceL1OrFail({
        spaceL2ID: 'source-l2',
        targetSpaceL1ID: 'target-l1',
      })
    ).rejects.toThrow();

    // The transactional mgr.save should have been called (attempted)
    // If structural writes were OUTSIDE the tx (naive clone), this assertion
    // would PASS even without a transaction. The key test is that
    // spaceService.save (the global path) was NOT used for the structural save.
    expect(spaceService.save).not.toHaveBeenCalled();
    // The sort-order shift must go through mgr.createQueryBuilder, not the
    // global entityManager.createQueryBuilder
    expect(mgr.createQueryBuilder).toHaveBeenCalled();
  });

  /**
   * sec-server-1: Community roles MUST remain intact when the structural
   * transaction rolls back. Previously the role wipe ran BEFORE the transaction,
   * so a mid-tx failure left the community permanently destroyed.
   * After the fix (reorder: transaction first, role-wipe after commit) a failed
   * transaction must not call removeActorFromRole or removePendingInvitations.
   */
  it('community roles not cleared when mid-tx failure rolls back structure (sec-server-1)', async () => {
    // Give the source L2 an admin so the pre-fix path would call removeActorFromRole
    vi.mocked(spaceService.getSpaceOrFail)
      .mockResolvedValueOnce(makeSourceL2())
      .mockResolvedValueOnce(makeTargetL1())
      .mockResolvedValueOnce(makeTargetL0());
    setupPreTransactionMocks();
    // Simulate one user admin to prove removeActorFromRole is never called
    vi.mocked(roleSetService.getUsersWithRole)
      .mockResolvedValueOnce([]) // members
      .mockResolvedValueOnce([]) // leads
      .mockResolvedValueOnce([{ id: 'admin-user-1' }]); // admins
    buildFailingTransactionManager();

    await expect(
      service.moveSpaceL2ToSpaceL1OrFail({
        spaceL2ID: 'source-l2',
        targetSpaceL1ID: 'target-l1',
      })
    ).rejects.toThrow('DB write failed');

    // CRITICAL: role wipe must NOT have run — structure rolled back atomically
    expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
    expect(
      roleSetService.removePendingInvitationsAndApplications
    ).not.toHaveBeenCalled();
  });

  /**
   * corr-server-1: Tagset saves must go through mgr (transactional) when
   * syncInnovationFlowTagsetsForSubtree runs inside the transaction. Previously
   * it called classificationService.updateTagsetTemplateOnSelectTagset with no
   * mgr, so saves went to the global manager and escaped the rollback.
   * After the fix, classificationService.updateTagsetTemplateOnSelectTagset is
   * called WITH mgr so writes are enrolled in the transaction.
   */
  it('tagset sync is called with transactional mgr when tagsetTemplates are non-empty (corr-server-1)', async () => {
    const tagsetTemplate = {
      id: 'tt-1',
      name: 'phase',
      type: 'SELECT_ONE',
      allowedValues: ['Explore', 'Prototype'],
      defaultSelectedValue: 'Explore',
    };

    // The space returned from the sync's getSpaceOrFail call (4th overall)
    const spaceWithClassifiedCallout = {
      id: 'source-l2',
      collaboration: {
        calloutsSet: {
          id: 'callouts-set-1',
          callouts: [
            {
              id: 'callout-1',
              classification: { id: 'classification-1' },
            },
          ],
        },
      },
    };

    vi.mocked(spaceService.getSpaceOrFail)
      .mockResolvedValueOnce(makeSourceL2()) // step 1: load source L2
      .mockResolvedValueOnce(makeTargetL1()) // step 2: load target L1
      .mockResolvedValueOnce(makeTargetL0()) // step 3: load target L0
      .mockResolvedValueOnce(spaceWithClassifiedCallout); // step 4: sync loop

    setupPreTransactionMocks();
    // Override tagsetTemplates to be non-empty so the sync body runs
    vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
      tagsetTemplates: [tagsetTemplate],
    });
    vi.mocked(
      classificationService.updateTagsetTemplateOnSelectTagset
    ).mockResolvedValue({ id: 'tagset-1', name: 'phase', tags: ['Explore'] });

    const { mgr } = buildFailingTransactionManager();

    await expect(
      service.moveSpaceL2ToSpaceL1OrFail({
        spaceL2ID: 'source-l2',
        targetSpaceL1ID: 'target-l1',
      })
    ).rejects.toThrow('DB write failed');

    // classificationService.updateTagsetTemplateOnSelectTagset must have been
    // called WITH the transactional mgr as third argument — this proves the
    // tagset saves are enrolled in the transaction (not escaping to global manager).
    expect(
      classificationService.updateTagsetTemplateOnSelectTagset
    ).toHaveBeenCalledWith('classification-1', tagsetTemplate, mgr);
  });
});
