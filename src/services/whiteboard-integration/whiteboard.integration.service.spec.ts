import { vi } from 'vitest';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
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
import type { Mocked } from 'vitest';

const buildGuestAgentInfo = (guestName: string): AgentInfo => {
  const agentInfo = new AgentInfo();
  agentInfo.guestName = guestName;
  return agentInfo;
};

describe('WhiteboardIntegrationService - guest handling', () => {
  let service: WhiteboardIntegrationService;
  let whiteboardService: Mocked<WhiteboardService>;
  let authorizationService: Mocked<AuthorizationService>;
  let authenticationService: Mocked<AuthenticationService>;
  let contributionReporter: Mocked<ContributionReporterService>;
  let communityResolver: Mocked<CommunityResolverService>;
  let activityAdapter: Mocked<ActivityAdapter>;
  let agentInfoService: Mocked<AgentInfoService>;
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
      agentInfoService,
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
      getAgentInfo: vi.fn(),
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

    agentInfoService = {
      buildAgentInfoForUser: vi.fn(),
      createGuestAgentInfo: vi
        .fn()
        .mockImplementation(name => buildGuestAgentInfo(name)),
    } as unknown as Mocked<AgentInfoService>;

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
