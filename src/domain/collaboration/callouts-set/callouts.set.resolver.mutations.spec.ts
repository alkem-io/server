import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutService } from '../callout/callout.service';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetResolverMutations } from './callouts.set.resolver.mutations';
import { CalloutsSetService } from './callouts.set.service';

describe('CalloutsSetResolverMutations', () => {
  let resolver: CalloutsSetResolverMutations;
  let calloutsSetService: CalloutsSetService;
  let calloutService: CalloutService;
  let authorizationService: AuthorizationService;
  let _authorizationPolicyService: AuthorizationPolicyService;
  let calloutAuthorizationService: CalloutAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutsSetResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutsSetResolverMutations);
    calloutsSetService = module.get(CalloutsSetService);
    calloutService = module.get(CalloutService);
    authorizationService = module.get(AuthorizationService);
    _authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutAuthorizationService = module.get(CalloutAuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createCalloutOnCalloutsSet', () => {
    it('should check authorization and create callout', async () => {
      const calloutsSet = {
        id: 'cs-1',
        type: CalloutsSetType.KNOWLEDGE_BASE,
        authorization: { id: 'auth-1' },
      } as any;
      const callout = {
        id: 'callout-1',
        nameID: 'test-callout',
        settings: { visibility: CalloutVisibility.DRAFT },
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        calloutsSetService.createCalloutOnCalloutsSet
      ).mockResolvedValue(callout);
      vi.mocked(calloutService.save).mockResolvedValue(callout);
      vi.mocked(calloutService.getStorageBucket).mockResolvedValue({
        id: 'sb-1',
      } as any);
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const temporaryStorageService = (resolver as any).temporaryStorageService;
      vi.mocked(
        temporaryStorageService.moveTemporaryDocuments
      ).mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1' } as any;

      const _result = await resolver.createCalloutOnCalloutsSet(actorContext, {
        calloutsSetID: 'cs-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        calloutsSet.authorization,
        AuthorizationPrivilege.CREATE_CALLOUT,
        expect.any(String)
      );
      expect(calloutsSetService.createCalloutOnCalloutsSet).toHaveBeenCalled();
    });

    it('should trigger notifications and activity when published on COLLABORATION type', async () => {
      const calloutsSet = {
        id: 'cs-1',
        type: CalloutsSetType.COLLABORATION,
        authorization: { id: 'auth-1' },
      } as any;
      const callout = {
        id: 'callout-1',
        nameID: 'test-callout',
        settings: { visibility: CalloutVisibility.PUBLISHED },
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(
        calloutsSetService.createCalloutOnCalloutsSet
      ).mockResolvedValue(callout);
      vi.mocked(calloutService.save).mockResolvedValue(callout);
      vi.mocked(calloutService.getStorageBucket).mockResolvedValue({
        id: 'sb-1',
      } as any);
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const temporaryStorageService = (resolver as any).temporaryStorageService;
      vi.mocked(
        temporaryStorageService.moveTemporaryDocuments
      ).mockResolvedValue(undefined);

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndSettingsForCollaborationCalloutsSet
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
        spaceSettings: {},
      });

      const communityResolverService = (resolver as any)
        .communityResolverService;
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForCalloutsSet
      ).mockResolvedValue('space-1');

      const actorContext = { actorID: 'user-1' } as any;

      await resolver.createCalloutOnCalloutsSet(actorContext, {
        calloutsSetID: 'cs-1',
        sendNotification: true,
      } as any);

      const activityAdapter = (resolver as any).activityAdapter;
      expect(activityAdapter.calloutPublished).toHaveBeenCalled();
    });
  });

  describe('updateCalloutsSortOrder', () => {
    it('should check authorization and delegate to service', async () => {
      const calloutsSet = {
        id: 'cs-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(calloutsSetService.getCalloutsSetOrFail).mockResolvedValue(
        calloutsSet
      );
      vi.mocked(calloutsSetService.updateCalloutsSortOrder).mockResolvedValue([
        { id: 'c-1' },
      ] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateCalloutsSortOrder(actorContext, {
        calloutsSetID: 'cs-1',
        calloutIDs: ['c-1'],
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        calloutsSet.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toHaveLength(1);
    });
  });
});
