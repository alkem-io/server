import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';

describe('CalloutResolverMutations', () => {
  let resolver: CalloutResolverMutations;
  let calloutService: CalloutService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutAuthorizationService: CalloutAuthorizationService;
  let _contributionAuthorizationService: CalloutContributionAuthorizationService;
  let _calloutContributionService: CalloutContributionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: SUBSCRIPTION_CALLOUT_POST_CREATED,
          useValue: { publish: vi.fn() },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutResolverMutations);
    calloutService = module.get(CalloutService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutAuthorizationService = module.get(CalloutAuthorizationService);
    _contributionAuthorizationService = module.get(
      CalloutContributionAuthorizationService
    );
    _calloutContributionService = module.get(CalloutContributionService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteCallout', () => {
    it('should check authorization and delete callout', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.deleteCallout).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.deleteCallout(actorContext, {
        ID: 'callout-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(calloutService.deleteCallout).toHaveBeenCalledWith('callout-1');
      expect(result).toBe(callout);
    });
  });

  describe('updateCallout', () => {
    it('should check authorization, update callout, and reset auth policy', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedCallout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCallout).mockResolvedValue(updatedCallout);

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
      });

      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'updated-auth' }] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const _result = await resolver.updateCallout(actorContext, {
        ID: 'callout-1',
        framing: {},
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(calloutService.updateCallout).toHaveBeenCalled();
      expect(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
    });
  });

  describe('updateCalloutVisibility', () => {
    it('should update visibility and reset auth policy', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        isTemplate: false,
        settings: { visibility: CalloutVisibility.DRAFT },
        framing: {},
        calloutsSet: {
          type: CalloutsSetType.COLLABORATION,
          authorization: { id: 'cs-auth' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCalloutVisibility).mockResolvedValue({
        ...callout,
        isTemplate: false,
        settings: { visibility: CalloutVisibility.PUBLISHED },
      } as any);
      vi.mocked(calloutService.updateCalloutPublishInfo).mockResolvedValue(
        callout
      );

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
      });

      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const actorContext = { actorID: 'user-1' } as any;

      await resolver.updateCalloutVisibility(actorContext, {
        calloutID: 'callout-1',
        visibility: CalloutVisibility.PUBLISHED,
        sendNotification: false,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(calloutService.updateCalloutVisibility).toHaveBeenCalled();
    });
  });

  describe('updateCalloutPublishInfo', () => {
    it('should check authorization and update publish info', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCalloutPublishInfo).mockResolvedValue(
        callout
      );

      const actorContext = { actorID: 'user-1' } as any;

      await resolver.updateCalloutPublishInfo(actorContext, {
        calloutID: 'callout-1',
        publisherID: 'pub-1',
        publishDate: Date.now(),
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER,
        expect.any(String)
      );
    });
  });

  describe('createContributionOnCallout', () => {
    it('should throw RelationshipNotFoundException when callout has no calloutsSet', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: undefined,
        settings: {
          contribution: { enabled: true, canAddContributions: 'ALL' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw CalloutClosedException when contributions are disabled', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: false,
            canAddContributions: CalloutAllowedActors.MEMBERS,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });

    it('should throw CalloutClosedException when canAddContributions is NONE', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.NONE,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });

    it('should throw CalloutClosedException when admins-only and user lacks UPDATE', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.ADMINS,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });
  });

  describe('updateContributionsSortOrder', () => {
    it('should check authorization and delegate to service', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        calloutService.updateContributionCalloutsSortOrder
      ).mockResolvedValue([{ id: 'c-1' }] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateContributionsSortOrder(actorContext, {
        calloutID: 'callout-1',
        contributionIDs: ['c-1'],
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toHaveLength(1);
    });
  });
});
