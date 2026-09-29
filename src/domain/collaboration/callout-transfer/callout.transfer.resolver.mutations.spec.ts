import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { CalloutService } from '../callout/callout.service';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CalloutTransferResolverMutations } from './callout.transfer.resolver.mutations';
import { CalloutTransferService } from './callout.transfer.service';

/**
 * 027-platform-role-redesign (T044, A9, T070e) — `transferCallout` is a
 * single-path surface (TRANSFER_RESOURCE_OFFER on the source AND
 * TRANSFER_RESOURCE_ACCEPT on the target both required, no ordinary-owner
 * branch): every successful call is audited.
 */
describe('CalloutTransferResolverMutations', () => {
  let resolver: CalloutTransferResolverMutations;
  let authorizationService: Record<string, Mock>;
  let calloutService: Record<string, Mock>;
  let calloutsSetService: Record<string, Mock>;
  let calloutTransferService: Record<string, Mock>;
  let calloutAuthorizationService: Record<string, Mock>;
  let roomResolverService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let platformResourceAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;
  const callout = {
    id: 'callout-1',
    isTemplate: false,
    calloutsSet: { authorization: { id: 'source-auth' } },
  };
  const targetCalloutsSet = {
    id: 'target-set-1',
    authorization: { id: 'target-auth' },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutTransferResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutTransferResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    calloutService = module.get(CalloutService) as any;
    calloutsSetService = module.get(CalloutsSetService) as any;
    calloutTransferService = module.get(CalloutTransferService) as any;
    calloutAuthorizationService = module.get(
      CalloutAuthorizationService
    ) as any;
    roomResolverService = module.get(RoomResolverService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    platformResourceAuditService = module.get(
      PlatformResourceAuditService
    ) as any;

    calloutService.getCalloutOrFail.mockResolvedValue(callout);
    calloutsSetService.getCalloutsSetOrFail.mockResolvedValue(
      targetCalloutsSet
    );
    roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout.mockResolvedValue(
      { platformRolesAccess: {} }
    );
    calloutAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
    authorizationPolicyService.saveAll.mockResolvedValue(undefined);
  });

  it('permitted: gates both TRANSFER_RESOURCE_OFFER and TRANSFER_RESOURCE_ACCEPT, transfers and audits', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    calloutTransferService.transferCallout.mockResolvedValue(undefined);

    await resolver.transferCallout(actorContext, {
      calloutID: 'callout-1',
      targetCalloutsSetID: 'target-set-1',
    } as any);

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      callout.calloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
      expect.any(String)
    );
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      targetCalloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
      expect.any(String)
    );
    expect(calloutTransferService.transferCallout).toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).toHaveBeenCalledWith(
      actorContext,
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({ resourceId: 'callout-1', outcome: 'moved' })
    );
  });

  it('denied on the OFFER side: propagates the failure without transferring or auditing', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(
      (_ctx: unknown, _auth: unknown, privilege: string) => {
        if (privilege === AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER) {
          throw new Error('Forbidden');
        }
      }
    );

    await expect(
      resolver.transferCallout(actorContext, {
        calloutID: 'callout-1',
        targetCalloutsSetID: 'target-set-1',
      } as any)
    ).rejects.toThrow('Forbidden');
    expect(calloutTransferService.transferCallout).not.toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).not.toHaveBeenCalled();
  });

  it('denied on the ACCEPT side: propagates the failure without transferring or auditing', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(
      (_ctx: unknown, _auth: unknown, privilege: string) => {
        if (privilege === AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT) {
          throw new Error('Forbidden');
        }
      }
    );

    await expect(
      resolver.transferCallout(actorContext, {
        calloutID: 'callout-1',
        targetCalloutsSetID: 'target-set-1',
      } as any)
    ).rejects.toThrow('Forbidden');
    expect(calloutTransferService.transferCallout).not.toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).not.toHaveBeenCalled();
  });
});
