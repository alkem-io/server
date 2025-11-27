import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LoggerService } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  UserAuthenticationLinkOutcome,
  UserAuthenticationLinkResult,
  UserAuthenticationLinkMatch,
} from '@domain/community/user-authentication-link/user.authentication.link.types';

describe('UserService.createUserFromAgentInfo', () => {
  const createService = () => {
    const userAuthenticationLinkServiceMock = {
      resolveExistingUser: jest.fn(),
      ensureAuthenticationIdAvailable: jest.fn(),
    } as {
      resolveExistingUser: jest.Mock;
      ensureAuthenticationIdAvailable: jest.Mock;
    };

    const cacheManagerMock = {
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    } as {
      set: jest.Mock;
      del: jest.Mock;
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
      loggerMock,
      cacheManagerMock as unknown as Cache
    );

    return {
      service,
      userAuthenticationLinkServiceMock,
      cacheManagerMock,
    };
  };

  const buildAgentInfo = (overrides: Partial<AgentInfo> = {}) => {
    const agentInfo = new AgentInfo();
    agentInfo.firstName = 'Existing';
    agentInfo.lastName = 'User';
    Object.assign(agentInfo, overrides);
    return agentInfo;
  };

  it('returns existing user when authentication ID already linked', async () => {
    const { service, userAuthenticationLinkServiceMock } = createService();

    const agentInfo = buildAgentInfo({
      authenticationID: 'kratos-identity-001',
    });
    const email = 'user@example.com';

    const resolveResult: UserAuthenticationLinkResult = {
      user: {
        id: 'user-1',
        email: email,
        authenticationID: agentInfo.authenticationID,
      } as any,
      matchedBy: UserAuthenticationLinkMatch.AUTHENTICATION_ID,
      outcome: UserAuthenticationLinkOutcome.ALREADY_LINKED,
    };

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      resolveResult
    );

    const result = await service.createUserFromAgentInfo(agentInfo, email);

    expect(result).toBe(resolveResult.user);
    expect(
      userAuthenticationLinkServiceMock.resolveExistingUser
    ).toHaveBeenCalledTimes(1);
  });

  it('refreshes cache when authentication ID is linked during lookup', async () => {
    const { service, userAuthenticationLinkServiceMock, cacheManagerMock } =
      createService();

    const agentInfo = buildAgentInfo({
      authenticationID: 'kratos-identity-002',
    });
    const email = 'user@example.com';

    const resolveResult: UserAuthenticationLinkResult = {
      user: {
        id: 'user-2',
        email: email,
        authenticationID: agentInfo.authenticationID,
        agent: { id: 'agent-2' },
      } as any,
      matchedBy: UserAuthenticationLinkMatch.EMAIL,
      outcome: UserAuthenticationLinkOutcome.LINKED,
    };

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      resolveResult
    );

    const result = await service.createUserFromAgentInfo(agentInfo, email);

    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      '@user:agentId:agent-2',
      resolveResult.user,
      expect.objectContaining({ ttl: expect.any(Number) })
    );
    expect(result).toEqual(resolveResult.user);
  });

  it('falls back to user creation when linking service finds no user', async () => {
    const { service, userAuthenticationLinkServiceMock } = createService();
    const agentInfo = buildAgentInfo();
    const email = 'user@example.com';

    userAuthenticationLinkServiceMock.resolveExistingUser.mockResolvedValue(
      null
    );

    const createUserSpy = jest
      .spyOn(service, 'createUser')
      .mockResolvedValue({ id: 'new-user' } as any);

    const result = await service.createUserFromAgentInfo(agentInfo, email);

    expect(createUserSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: email }),
      agentInfo
    );
    expect(result).toEqual({ id: 'new-user' });
  });
});
