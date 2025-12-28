import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context';
import { ActorContextService } from '@core/actor-context';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AccessGrantedInputData } from '@services/whiteboard-integration/inputs';
import { WhiteboardIntegrationService } from '@services/whiteboard-integration/whiteboard.integration.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestjs/common';
import { AlkemioConfig } from '@src/types';

const buildGuestActorContext = (guestName: string): ActorContext => {
  const authCtx = new ActorContext();
  authCtx.guestName = guestName;
  return authCtx;
};

describe('WhiteboardIntegrationService - guest handling', () => {
  let service: WhiteboardIntegrationService;
  let whiteboardService: jest.Mocked<WhiteboardService>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let authenticationService: jest.Mocked<AuthenticationService>;
  let contributionReporter: jest.Mocked<ContributionReporterService>;
  let communityResolver: jest.Mocked<CommunityResolverService>;
  let activityAdapter: jest.Mocked<ActivityAdapter>;
  let actorContextService: jest.Mocked<ActorContextService>;
  let configService: jest.Mocked<ConfigService<AlkemioConfig, true>>;
  let logger: jest.Mocked<LoggerService>;

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
      getWhiteboardOrFail: jest.fn().mockResolvedValue({
        id: 'whiteboard-1',
        authorization: { id: 'authorization-1' },
      }),
    } as unknown as jest.Mocked<WhiteboardService>;

    authorizationService = {
      isAccessGranted: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<AuthorizationService>;

    authenticationService = {
      getActorContext: jest.fn(),
    } as unknown as jest.Mocked<AuthenticationService>;

    contributionReporter = {
      whiteboardContribution: jest.fn(),
    } as unknown as jest.Mocked<ContributionReporterService>;

    communityResolver = {
      getCommunityFromWhiteboardOrFail: jest.fn(),
      getLevelZeroSpaceIdForCommunity: jest.fn(),
    } as unknown as jest.Mocked<CommunityResolverService>;

    activityAdapter = {
      calloutWhiteboardContentModified: jest.fn(),
    } as unknown as jest.Mocked<ActivityAdapter>;

    actorContextService = {
      buildForUser: jest.fn(),
      createGuest: jest
        .fn()
        .mockImplementation(name => buildGuestActorContext(name)),
    } as unknown as jest.Mocked<ActorContextService>;

    configService = {
      get: jest.fn().mockReturnValue(10),
    } as unknown as jest.Mocked<ConfigService<AlkemioConfig, true>>;

    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = createService();
  });

  it('creates guest actor context when userId is marked as not available', async () => {
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
});
