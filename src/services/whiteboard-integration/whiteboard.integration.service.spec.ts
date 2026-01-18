import { AuthorizationPrivilege } from '@common/enums';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AccessGrantedInputData } from '@services/whiteboard-integration/inputs';
import { WhiteboardIntegrationService } from '@services/whiteboard-integration/whiteboard.integration.service';
import { AlkemioConfig } from '@src/types';

const buildGuestAgentInfo = (guestName: string): AgentInfo => {
  const agentInfo = new AgentInfo();
  agentInfo.guestName = guestName;
  return agentInfo;
};

describe('WhiteboardIntegrationService - guest handling', () => {
  let service: WhiteboardIntegrationService;
  let whiteboardService: jest.Mocked<WhiteboardService>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let authenticationService: jest.Mocked<AuthenticationService>;
  let contributionReporter: jest.Mocked<ContributionReporterService>;
  let communityResolver: jest.Mocked<CommunityResolverService>;
  let activityAdapter: jest.Mocked<ActivityAdapter>;
  let agentInfoService: jest.Mocked<AgentInfoService>;
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
      agentInfoService,
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
      getAgentInfo: jest.fn(),
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

    agentInfoService = {
      buildAgentInfoForUser: jest.fn(),
      createGuestAgentInfo: jest
        .fn()
        .mockImplementation(name => buildGuestAgentInfo(name)),
    } as unknown as jest.Mocked<AgentInfoService>;

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

  it('creates guest agent info when userId is marked as not available', async () => {
    const payload: AccessGrantedInputData = {
      userId: 'N/A',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
      guestName: '  Nick  ',
    };

    const result = await service.accessGranted(payload);

    expect(agentInfoService.buildAgentInfoForUser).not.toHaveBeenCalled();
    expect(agentInfoService.createGuestAgentInfo).toHaveBeenCalledWith('Nick');
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      expect.objectContaining({ guestName: 'Nick' }),
      expect.anything(),
      AuthorizationPrivilege.READ
    );
    expect(result).toBe(true);
  });

  it('falls back to guest credentials when lookup fails and guest name is provided', async () => {
    agentInfoService.buildAgentInfoForUser.mockRejectedValueOnce(
      new Error('lookup failed')
    );

    const payload: AccessGrantedInputData = {
      userId: 'user-123',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
      guestName: 'Taylor',
    };

    const result = await service.accessGranted(payload);

    expect(agentInfoService.createGuestAgentInfo).toHaveBeenCalledWith(
      'Taylor'
    );
    expect(result).toBe(true);
  });

  it('uses a default display name when no guest name is supplied', async () => {
    const payload: AccessGrantedInputData = {
      userId: '',
      whiteboardId: 'whiteboard-guest',
      privilege: AuthorizationPrivilege.READ,
    };

    await service.accessGranted(payload);

    expect(agentInfoService.createGuestAgentInfo).toHaveBeenCalledWith(
      'Guest collaborator'
    );
  });
});
