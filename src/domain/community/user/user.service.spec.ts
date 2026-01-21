import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './user.entity';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ConfigService } from '@nestjs/config';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LoggerService } from '@nestjs/common';
import {
  UserAuthenticationLinkOutcome,
  UserAuthenticationLinkResult,
  UserAuthenticationLinkMatch,
} from '@domain/community/user-authentication-link/user.authentication.link.types';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        repositoryProviderMockFactory(User),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

const ConfigServiceMock = {
  get: jest.fn().mockReturnValue({
    kratos_admin_base_url_server: 'mockUrl',
  }),
};

describe('UserService.createOrLinkUserFromAgentInfo', () => {
  const createService = () => {
    const userAuthenticationLinkServiceMock = {
      resolveExistingUser: jest.fn(),
      ensureAuthenticationIdAvailable: jest.fn(),
    } as {
      resolveExistingUser: jest.Mock;
      ensureAuthenticationIdAvailable: jest.Mock;
    };

    const loggerMock: LoggerService & { verbose: jest.Mock } = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const service = new UserService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { deleteAgentInfoFromCache: jest.fn() } as any,
      userAuthenticationLinkServiceMock as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      loggerMock
    );

    return {
      service,
      userAuthenticationLinkServiceMock,
    };
  };

  const buildAgentInfo = (overrides: Partial<AgentInfo> = {}) => {
    const agentInfo = new AgentInfo();
    agentInfo.email = 'user@example.com';
    agentInfo.firstName = 'Existing';
    agentInfo.lastName = 'User';
    Object.assign(agentInfo, overrides);
    return agentInfo;
  };

  it('returns existing user with isNew=false when authentication ID already linked', async () => {
    const { service, userAuthenticationLinkServiceMock } = createService();

    const agentInfo = buildAgentInfo({
      authenticationID: 'kratos-identity-001',
    });

    const resolveResult: UserAuthenticationLinkResult = {
      user: {
        id: 'user-1',
        email: agentInfo.email,
        authenticationID: agentInfo.authenticationID,
      } as any,
      matchedBy: UserAuthenticationLinkMatch.AUTHENTICATION_ID,
      outcome: UserAuthenticationLinkOutcome.ALREADY_LINKED,
    };

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      resolveResult
    );

    const result = await service.createOrLinkUserFromAgentInfo(agentInfo);

    expect(result.user).toBe(resolveResult.user);
    expect(result.isNew).toBe(false);
    expect(
      userAuthenticationLinkServiceMock.resolveExistingUser
    ).toHaveBeenCalledTimes(1);
  });

  it('returns user with isNew=false when authentication ID is linked during lookup', async () => {
    const { service, userAuthenticationLinkServiceMock } = createService();

    const agentInfo = buildAgentInfo({
      authenticationID: 'kratos-identity-002',
    });

    const resolveResult: UserAuthenticationLinkResult = {
      user: {
        id: 'user-2',
        email: agentInfo.email,
        authenticationID: agentInfo.authenticationID,
      } as any,
      matchedBy: UserAuthenticationLinkMatch.EMAIL,
      outcome: UserAuthenticationLinkOutcome.LINKED,
    };

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      resolveResult
    );

    const result = await service.createOrLinkUserFromAgentInfo(agentInfo);

    expect(result.user).toEqual(resolveResult.user);
    expect(result.isNew).toBe(false);
  });

  it('creates new user with isNew=true when linking service finds no user', async () => {
    const { service, userAuthenticationLinkServiceMock } = createService();
    const agentInfo = buildAgentInfo();

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      null
    );

    const createUserSpy = jest
      .spyOn(service, 'createUser')
      .mockResolvedValue({ id: 'new-user' } as any);

    const result = await service.createOrLinkUserFromAgentInfo(agentInfo);

    expect(createUserSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: agentInfo.email }),
      agentInfo
    );
    expect(result.user).toEqual({ id: 'new-user' });
    expect(result.isNew).toBe(true);
  });
});
