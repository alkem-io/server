import { AuthorizationPrivilege } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { SpaceMembershipProjectionService } from './space.membership.projection.service';

describe('SpaceMembershipProjectionService', () => {
  let service: SpaceMembershipProjectionService;
  let spaceLookupService: Mocked<SpaceLookupService>;
  let actorLookupService: Mocked<ActorLookupService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;

  const SPACE_ID = 'space-1';

  /**
   * A seeded persisted policy: a direct-member rule, an ancestor-admin rule
   * (credential on a parent space), a platform-admin rule — all granting
   * CONTRIBUTE — plus an organization-credential rule that must be excluded
   * by actor-type filtering, and a read-only rule that must not participate.
   */
  const seededAuthorization = () => ({
    credentialRules: [
      {
        grantedPrivileges: [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.CONTRIBUTE,
        ],
        criterias: [{ type: 'space-member', resourceID: SPACE_ID }],
      },
      {
        grantedPrivileges: [
          AuthorizationPrivilege.CONTRIBUTE,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
        ],
        criterias: [
          { type: 'space-admin', resourceID: 'parent-space' },
          { type: 'global-admin', resourceID: '' },
        ],
      },
      {
        // read-only rule (e.g. public read): never expands into membership
        grantedPrivileges: [AuthorizationPrivilege.READ],
        criterias: [{ type: 'global-registered', resourceID: '' }],
      },
    ],
  });

  const holders: Record<string, string[]> = {
    [`space-member:${SPACE_ID}`]: ['direct-member'],
    'space-admin:parent-space': ['ancestor-admin'],
    'global-admin:': ['platform-admin'],
    'global-registered:': ['everyone-1', 'everyone-2'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceMembershipProjectionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceMembershipProjectionService);
    spaceLookupService = module.get(SpaceLookupService);
    actorLookupService = module.get(ActorLookupService);
    communicationAdapter = module.get(CommunicationAdapter);

    spaceLookupService.getSpaceOrFail.mockResolvedValue({
      id: SPACE_ID,
      authorization: seededAuthorization(),
    } as any);
    actorLookupService.getActorIDsWithCredential.mockImplementation((async (
      criteria: any,
      actorTypes: ActorType[]
    ) => {
      expect(actorTypes).toEqual([
        ActorType.USER,
        ActorType.VIRTUAL_CONTRIBUTOR,
      ]);
      return holders[`${criteria.type}:${criteria.resourceID}`] ?? [];
    }) as any);
    communicationAdapter.batchAddSpaceMember.mockResolvedValue(true);
    communicationAdapter.revokeSpaceMember.mockResolvedValue({
      allSucceeded: true,
      childRoomsKicked: 0,
      failedContextIds: [],
    });
    communicationAdapter.repairSpaceGovernance.mockResolvedValue({
      success: true,
    } as any);
  });

  describe('desiredMembers — expansion from CURRENT authorization', () => {
    it('includes direct members, ancestor admins and platform admins; excludes read-level grants', async () => {
      const desired = await service.desiredMembers(SPACE_ID);

      expect([...desired].sort()).toEqual([
        'ancestor-admin',
        'direct-member',
        'platform-admin',
      ]);
      // never the unbounded read-level holders
      expect(desired.has('everyone-1')).toBe(false);
    });

    it('elevatedMembers carries only UPDATE/GRANT holders', async () => {
      const elevated = await service.elevatedMembers(SPACE_ID);
      expect([...elevated].sort()).toEqual([
        'ancestor-admin',
        'platform-admin',
      ]);
      expect(elevated.has('direct-member')).toBe(false);
    });
  });

  describe('projectActor — targeted, awaited, no brake', () => {
    it('adds a desired actor to the space room', async () => {
      await service.projectActor('direct-member', SPACE_ID);

      expect(communicationAdapter.batchAddSpaceMember).toHaveBeenCalledWith(
        'direct-member',
        [SPACE_ID]
      );
      expect(communicationAdapter.revokeSpaceMember).not.toHaveBeenCalled();
    });

    it('revokes an actor no longer desired — through the cascading topic', async () => {
      await service.projectActor('former-member', SPACE_ID);

      expect(communicationAdapter.revokeSpaceMember).toHaveBeenCalledWith(
        'former-member',
        [SPACE_ID],
        expect.any(String)
      );
      // demotion-capable change → elevated set re-declared
      expect(communicationAdapter.repairSpaceGovernance).toHaveBeenCalled();
    });

    it('never throws into the role mutation — failures are recorded divergences', async () => {
      communicationAdapter.batchAddSpaceMember.mockRejectedValue(
        new Error('transport down')
      );

      await expect(
        service.projectActor('direct-member', SPACE_ID)
      ).resolves.toBeUndefined();
    });
  });

  describe('projectSpace — mass, braked, budgeted, report-first', () => {
    it('brake: an empty desired set aborts with ZERO writes', async () => {
      spaceLookupService.getSpaceOrFail.mockResolvedValue({
        id: SPACE_ID,
        authorization: { credentialRules: [] },
      } as any);
      communicationAdapter.getSpace.mockResolvedValue({
        memberActorIDs: ['a', 'b', 'c'],
      } as any);

      const report = await service.projectSpace(SPACE_ID, { dryRun: false });

      expect(report.aborted).toBe('brake');
      expect(report.writes).toBe(0);
      expect(communicationAdapter.revokeSpaceMember).not.toHaveBeenCalled();
    });

    it('brake: a removal ratio above one half aborts unless forced', async () => {
      communicationAdapter.getSpace.mockResolvedValue({
        memberActorIDs: [
          'direct-member',
          'stray-1',
          'stray-2',
          'stray-3',
          'stray-4',
        ],
      } as any);

      const braked = await service.projectSpace(SPACE_ID, { dryRun: false });
      expect(braked.aborted).toBe('brake');
      expect(braked.writes).toBe(0);

      const forced = await service.projectSpace(SPACE_ID, {
        dryRun: false,
        force: true,
      });
      expect(forced.aborted).toBeUndefined();
      expect(forced.writes).toBeGreaterThan(0);
    });

    it('dry run computes the diff and writes nothing; counts come from would-be writes', async () => {
      communicationAdapter.getSpace.mockResolvedValue({
        memberActorIDs: ['direct-member', 'stray-1'],
      } as any);

      const report = await service.projectSpace(SPACE_ID); // dryRun default

      expect(report.dryRun).toBe(true);
      // 2 adds (ancestor-admin, platform-admin) + 1 removal (stray-1)
      expect(report.writes).toBe(3);
      expect(report.toAdd?.sort()).toEqual([
        'ancestor-admin',
        'platform-admin',
      ]);
      expect(report.toRemove).toEqual(['stray-1']);
      expect(communicationAdapter.batchAddSpaceMember).not.toHaveBeenCalled();
      expect(communicationAdapter.revokeSpaceMember).not.toHaveBeenCalled();
    });

    it('honest-partial: budget exhaustion stops and reports the remaining scope', async () => {
      communicationAdapter.getSpace.mockResolvedValue({
        memberActorIDs: ['direct-member'],
      } as any);

      const report = await service.projectSpace(SPACE_ID, {
        dryRun: false,
        budget: 1,
      });

      expect(report.aborted).toBe('budget-exhausted');
      expect(report.writes).toBe(1);
      expect(report.unresolved.length).toBeGreaterThan(0);
      expect(report.budgetRemaining).toBe(0);
    });

    it('counts derive from actual writes: a failed add is failed, not repaired', async () => {
      communicationAdapter.getSpace.mockResolvedValue({
        memberActorIDs: ['direct-member', 'ancestor-admin'],
      } as any);
      communicationAdapter.batchAddSpaceMember.mockResolvedValue(false);

      const report = await service.projectSpace(SPACE_ID, { dryRun: false });

      expect(report.repaired).toBe(0);
      expect(report.writes).toBe(0);
      expect(report.failed).toHaveLength(1);
      expect(report.failed[0].id).toBe('platform-admin');
    });

    it('missing space room: unresolved, never guessed', async () => {
      communicationAdapter.getSpace.mockResolvedValue(null);

      const report = await service.projectSpace(SPACE_ID, { dryRun: false });

      expect(report.aborted).toBe('adapter-unreachable');
      expect(report.unresolved[0].reason).toBe('no-space-room');
    });
  });
});
