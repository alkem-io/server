import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { CalloutContributionMoveResolverMutations } from './callout.contribution.move.resolver.mutations';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { CalloutContributionService } from './callout.contribution.service';

/**
 * 027-platform-role-redesign (T044/T043, A8/A9, T070e) —
 * `moveContributionToCallout` (A9, single-path MOVE_CONTRIBUTION) and
 * `deleteContribution` (A8, D5 dual-path DELETE ∨ PLATFORM_CONTENT_FULL_ACCESS,
 * audited ONLY on the platform branch, FR-018a).
 */
describe('CalloutContributionMoveResolverMutations', () => {
  let resolver: CalloutContributionMoveResolverMutations;
  let authorizationService: Record<string, Mock>;
  let calloutContributionService: Record<string, Mock>;
  let calloutContributionMoveService: Record<string, Mock>;
  let platformResourceAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;
  const contribution = {
    id: 'contribution-1',
    type: 'link',
    authorization: { id: 'auth-1' },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutContributionMoveResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutContributionMoveResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    calloutContributionService = module.get(CalloutContributionService) as any;
    calloutContributionMoveService = module.get(
      CalloutContributionMoveService
    ) as any;
    platformResourceAuditService = module.get(
      PlatformResourceAuditService
    ) as any;
    calloutContributionService.getCalloutContributionOrFail.mockResolvedValue(
      contribution
    );
  });

  describe('moveContributionToCallout (A9)', () => {
    it('permitted: gates on MOVE_CONTRIBUTION and audits the move', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      calloutContributionMoveService.moveContributionToCallout.mockResolvedValue(
        contribution
      );

      await resolver.moveContributionToCallout(actorContext, {
        contributionID: 'contribution-1',
        calloutID: 'callout-2',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        contribution.authorization,
        AuthorizationPrivilege.MOVE_CONTRIBUTION,
        expect.any(String)
      );
      expect(
        platformResourceAuditService.recordEventForActor
      ).toHaveBeenCalledWith(
        actorContext,
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ outcome: 'moved' })
      );
    });

    it('denied: propagates the authorization failure without moving or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.moveContributionToCallout(actorContext, {
          contributionID: 'contribution-1',
          calloutID: 'callout-2',
        } as any)
      ).rejects.toThrow('Forbidden');
      expect(
        calloutContributionMoveService.moveContributionToCallout
      ).not.toHaveBeenCalled();
      expect(
        platformResourceAuditService.recordEventForActor
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteContribution (A8, dual-path)', () => {
    it('owner branch: deletes but does NOT audit (FR-018a)', async () => {
      authorizationService.isAccessGranted.mockImplementation(
        (_ctx: unknown, _auth: unknown, privilege: string) =>
          privilege === AuthorizationPrivilege.DELETE
      );
      calloutContributionService.delete.mockResolvedValue(contribution);

      const result = await resolver.deleteContribution(actorContext, {
        ID: 'contribution-1',
      } as any);

      expect(result).toBe(contribution);
      expect(
        platformResourceAuditService.recordEventForActor
      ).not.toHaveBeenCalled();
    });

    it('platform branch: deletes AND audits', async () => {
      authorizationService.isAccessGranted.mockImplementation(
        (_ctx: unknown, _auth: unknown, privilege: string) =>
          privilege === AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
      calloutContributionService.delete.mockResolvedValue(contribution);

      await resolver.deleteContribution(actorContext, {
        ID: 'contribution-1',
      } as any);

      expect(
        platformResourceAuditService.recordEventForActor
      ).toHaveBeenCalledWith(
        actorContext,
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ outcome: 'deleted' })
      );
    });

    it('denied: neither owner nor platform branch — grantAccessOrFail throws', async () => {
      authorizationService.isAccessGranted.mockReturnValue(false);
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.deleteContribution(actorContext, {
          ID: 'contribution-1',
        } as any)
      ).rejects.toThrow('Forbidden');
      expect(calloutContributionService.delete).not.toHaveBeenCalled();
    });
  });
});
