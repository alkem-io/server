import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AccessGrantedInputData } from '@services/whiteboard-integration/inputs';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from '@services/whiteboard-integration/outputs';
import { WhiteboardIntegrationService } from '@services/whiteboard-integration/whiteboard.integration.service';
import { AlkemioConfig } from '@src/types';
import type { Mocked } from 'vitest';
import { vi } from 'vitest';

const buildGuestActorContext = (guestName: string): ActorContext => {
  const actorContext = new ActorContext();
  actorContext.guestName = guestName;
  return actorContext;
};

describe('WhiteboardIntegrationService - guest handling', () => {
  let service: WhiteboardIntegrationService;
  let whiteboardService: Mocked<WhiteboardService>;
  let authorizationService: Mocked<AuthorizationService>;
  let authenticationService: Mocked<AuthenticationService>;
  let contributionReporter: Mocked<ContributionReporterService>;
  let communityResolver: Mocked<CommunityResolverService>;
  let activityAdapter: Mocked<ActivityAdapter>;
  let actorContextService: Mocked<ActorContextService>;
  let configService: Mocked<ConfigService<AlkemioConfig, true>>;
  let logger: Mocked<LoggerService>;

  const createService = () =>
    new WhiteboardIntegrationService(
      logger,
      authorizationService,
      authenticationService,
      whiteboardService,
      contributionReporter,
      communityResolver,
      activityAdapter,
      actorContextService,
      configService
    );

  beforeEach(() => {
    whiteboardService = {
      getWhiteboardOrFail: vi.fn().mockResolvedValue({
        id: 'whiteboard-1',
        authorization: { id: 'authorization-1' },
      }),
    } as unknown as Mocked<WhiteboardService>;

    authorizationService = {
      isAccessGranted: vi.fn().mockReturnValue(true),
    } as unknown as Mocked<AuthorizationService>;

    authenticationService = {
      getActorContext: vi.fn(),
    } as unknown as Mocked<AuthenticationService>;

    contributionReporter = {
      whiteboardContribution: vi.fn(),
    } as unknown as Mocked<ContributionReporterService>;

    communityResolver = {
      getCommunityFromWhiteboardOrFail: vi.fn(),
      getLevelZeroSpaceIdForCommunity: vi.fn(),
    } as unknown as Mocked<CommunityResolverService>;

    activityAdapter = {
      calloutWhiteboardContentModified: vi.fn(),
    } as unknown as Mocked<ActivityAdapter>;

    actorContextService = {
      buildForUser: vi.fn(),
      createGuest: vi
        .fn()
        .mockImplementation(name => buildGuestActorContext(name)),
    } as unknown as Mocked<ActorContextService>;

    configService = {
      get: vi.fn().mockReturnValue(10),
    } as unknown as Mocked<ConfigService<AlkemioConfig, true>>;

    logger = {
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
    } as unknown as Mocked<LoggerService>;

    service = createService();
  });

  it('creates guest agent info when userId is marked as not available', async () => {
    const payload: AccessGrantedInputData = {
      userId: 'N/A',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
      guestName: '  Nick  ',
    };

    const result = await service.accessGranted(payload);

    expect(actorContextService.buildForUser).not.toHaveBeenCalled();
    expect(actorContextService.createGuest).toHaveBeenCalledWith('Nick');
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      expect.objectContaining({ guestName: 'Nick' }),
      expect.anything(),
      AuthorizationPrivilege.READ
    );
    expect(result).toBe(true);
  });

  it('falls back to guest credentials when lookup fails and guest name is provided', async () => {
    actorContextService.buildForUser.mockRejectedValueOnce(
      new Error('lookup failed')
    );

    const payload: AccessGrantedInputData = {
      userId: 'user-123',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
      guestName: 'Taylor',
    };

    const result = await service.accessGranted(payload);

    expect(actorContextService.createGuest).toHaveBeenCalledWith('Taylor');
    expect(result).toBe(true);
  });

  it('uses a default display name when no guest name is supplied', async () => {
    const payload: AccessGrantedInputData = {
      userId: '',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
    };

    await service.accessGranted(payload);

    expect(actorContextService.createGuest).toHaveBeenCalledWith(
      'Guest collaborator'
    );
  });

  describe('info() – anonymous vs guest write access', () => {
    beforeEach(() => {
      whiteboardService.isMultiUser = vi.fn().mockResolvedValue(true);
    });

    it('denies write access for truly anonymous users (empty userId, no guestName)', async () => {
      const result = await service.info({
        userId: '',
        whiteboardId: 'whiteboard-1',
        guestName: '',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(false);
    });

    it('denies write access for N/A userId without guestName', async () => {
      const result = await service.info({
        userId: 'N/A',
        whiteboardId: 'whiteboard-1',
        guestName: '',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(false);
    });

    it('grants write access for guest-<uuid> userId even without guestName in info()', async () => {
      const result = await service.info({
        userId: 'guest-abc-123',
        whiteboardId: 'whiteboard-1',
        guestName: '',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(true);
    });

    it('grants write access when guestName is provided with empty userId', async () => {
      const result = await service.info({
        userId: '',
        whiteboardId: 'whiteboard-1',
        guestName: 'Nick',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(true);
    });
  });

  describe('info() – read denied', () => {
    it('returns all false when read access is denied', async () => {
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.info({
        userId: 'user-1',
        whiteboardId: 'whiteboard-1',
        guestName: '',
      } as any);

      expect(result.read).toBe(false);
      expect(result.update).toBe(false);
      expect(result.maxCollaborators).toBeUndefined();
    });
  });

  describe('info() – single-user whiteboard', () => {
    beforeEach(() => {
      const actorCtx = new ActorContext();
      actorCtx.actorID = 'user-1';
      actorContextService.buildForUser.mockResolvedValue(actorCtx);
      whiteboardService.isMultiUser = vi.fn().mockResolvedValue(false);
    });

    it('returns maxCollaborators=1 for single-user whiteboards', async () => {
      const result = await service.info({
        userId: 'user-1',
        whiteboardId: 'whiteboard-1',
        guestName: '',
      } as any);

      expect(result.maxCollaborators).toBe(1);
    });
  });

  describe('save()', () => {
    it('returns SaveContentData on successful save', async () => {
      whiteboardService.updateWhiteboardContent = vi
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.save({
        whiteboardId: 'wb-1',
        content: '{"elements":[]}',
      } as any);

      expect(result).toBeInstanceOf(SaveOutputData);
      expect(result.data).toBeInstanceOf(SaveContentData);
      expect((result.data as SaveContentData).success).toBe(true);
      expect(whiteboardService.updateWhiteboardContent).toHaveBeenCalledWith(
        'wb-1',
        '{"elements":[]}'
      );
    });

    it('returns SaveErrorData when save throws', async () => {
      whiteboardService.updateWhiteboardContent = vi
        .fn()
        .mockRejectedValue(new Error('DB connection lost'));

      const result = await service.save({
        whiteboardId: 'wb-1',
        content: '{}',
      } as any);

      expect(result).toBeInstanceOf(SaveOutputData);
      expect(result.data).toBeInstanceOf(SaveErrorData);
      expect((result.data as SaveErrorData).error).toBe('DB connection lost');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('fetch()', () => {
    it('returns FetchContentData on successful fetch', async () => {
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        id: 'wb-1',
        content: '{"elements":[1,2,3]}',
      } as any);

      const result = await service.fetch({ whiteboardId: 'wb-1' } as any);

      expect(result).toBeInstanceOf(FetchOutputData);
      expect(result.data).toBeInstanceOf(FetchContentData);
      expect((result.data as FetchContentData).content).toBe(
        '{"elements":[1,2,3]}'
      );
    });

    it('returns FetchErrorData when fetch throws', async () => {
      whiteboardService.getWhiteboardOrFail.mockRejectedValue(
        new Error('not found')
      );

      const result = await service.fetch({ whiteboardId: 'wb-bad' } as any);

      expect(result).toBeInstanceOf(FetchOutputData);
      expect(result.data).toBeInstanceOf(FetchErrorData);
      expect((result.data as FetchErrorData).error).toBe(
        'An error occurred while fetching the whiteboard content.'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('contribution()', () => {
    it('resolves community and reports contribution for each user', async () => {
      communityResolver.getCommunityFromWhiteboardOrFail.mockResolvedValue({
        id: 'community-1',
      } as any);
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );
      whiteboardService.getProfile = vi.fn().mockResolvedValue({
        displayName: 'My Whiteboard',
      });

      await service.contribution({
        whiteboardId: 'wb-1',
        users: [{ id: 'user-a' }, { id: 'user-b' }],
      } as any);

      expect(
        communityResolver.getCommunityFromWhiteboardOrFail
      ).toHaveBeenCalledWith('wb-1');
      expect(
        communityResolver.getLevelZeroSpaceIdForCommunity
      ).toHaveBeenCalledWith('community-1');
      expect(contributionReporter.whiteboardContribution).toHaveBeenCalledTimes(
        2
      );
      expect(contributionReporter.whiteboardContribution).toHaveBeenCalledWith(
        { id: 'wb-1', name: 'My Whiteboard', space: 'space-1' },
        { actorID: 'user-a' }
      );
      expect(contributionReporter.whiteboardContribution).toHaveBeenCalledWith(
        { id: 'wb-1', name: 'My Whiteboard', space: 'space-1' },
        { actorID: 'user-b' }
      );
    });
  });

  describe('contentModified()', () => {
    it('delegates to activityAdapter', () => {
      activityAdapter.calloutWhiteboardContentModified.mockResolvedValue(
        undefined as any
      );

      service.contentModified({
        triggeredBy: 'user-1',
        whiteboardId: 'wb-1',
      } as any);

      expect(
        activityAdapter.calloutWhiteboardContentModified
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        whiteboardId: 'wb-1',
      });
    });

    it('logs error when activityAdapter rejects', async () => {
      const error = new Error('adapter failure');
      activityAdapter.calloutWhiteboardContentModified.mockRejectedValue(error);

      service.contentModified({
        triggeredBy: 'user-1',
        whiteboardId: 'wb-1',
      } as any);

      // Wait for the catch handler to execute
      await vi.waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('accessGranted() – error handling', () => {
    it('returns false and logs when whiteboardService throws', async () => {
      whiteboardService.getWhiteboardOrFail.mockRejectedValue(
        new Error('whiteboard not found')
      );

      const result = await service.accessGranted({
        userId: 'user-1',
        whiteboardId: 'wb-bad',
        privilege: AuthorizationPrivilege.READ,
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns false when resolveActorContext returns null (user lookup fails without guestName)', async () => {
      actorContextService.buildForUser.mockRejectedValue(
        new Error('user not found')
      );

      const result = await service.accessGranted({
        userId: 'user-unknown',
        whiteboardId: 'wb-1',
        privilege: AuthorizationPrivilege.READ,
      });

      // Error is thrown by resolveActorContext and caught by accessGranted's catch
      expect(result).toBe(false);
    });
  });

  describe('isGuestUserIdentifier (via accessGranted)', () => {
    it.each([
      ['', true],
      ['guest', true],
      ['Guest', true],
      ['guest-abc-123', true],
      ['guest_user', true],
      ['GUEST', true],
      ['n/a', true],
      ['N/A', true],
      ['  ', true],
      ['user-123', false],
      ['regular-user', false],
    ])('identifies "%s" as guest=%s', async (userId: string, isGuest: boolean) => {
      const actorCtx = new ActorContext();
      actorCtx.actorID = userId;
      actorContextService.buildForUser.mockResolvedValue(actorCtx);

      await service.accessGranted({
        userId,
        whiteboardId: 'wb-1',
        privilege: AuthorizationPrivilege.READ,
      });

      if (isGuest) {
        expect(actorContextService.createGuest).toHaveBeenCalled();
        expect(actorContextService.buildForUser).not.toHaveBeenCalled();
      } else {
        expect(actorContextService.buildForUser).toHaveBeenCalledWith(userId);
      }
    });
  });
});
