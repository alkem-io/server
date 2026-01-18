import { LogContext } from '@common/enums';
import { UserAlreadyRegisteredException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UserAuthenticationLinkService } from '@domain/community/user-authentication-link/user.authentication.link.service';
import {
  UserAuthenticationLinkMatch,
  UserAuthenticationLinkOutcome,
} from '@domain/community/user-authentication-link/user.authentication.link.types';
import { LoggerService } from '@nestjs/common';

const createAgentInfo = (overrides: Partial<AgentInfo> = {}) => {
  const agentInfo = new AgentInfo();
  agentInfo.email = 'user@example.com';
  agentInfo.authenticationID = 'auth-123';
  Object.assign(agentInfo, overrides);
  return agentInfo;
};

describe('UserAuthenticationLinkService', () => {
  const createService = () => {
    const userLookupService = {
      getUserByAuthenticationID: jest.fn(),
      getUserByEmail: jest.fn(),
    };

    const userRepository = {
      save: jest.fn(async user => user),
    };

    const kratosService = {
      getIdentityById: jest.fn(),
    };

    const logger: LoggerService & {
      log: jest.Mock;
      verbose: jest.Mock;
      error: jest.Mock;
    } = {
      log: jest.fn(),
      verbose: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const service = new UserAuthenticationLinkService(
      userLookupService as any,
      userRepository as any,
      kratosService as any,
      logger
    );

    return {
      service,
      userLookupService,
      userRepository,
      kratosService,
      logger,
    };
  };

  it('returns existing user matched by authentication ID', async () => {
    const { service, userLookupService } = createService();
    const existingUser = { id: 'user-1', authenticationID: 'auth-123' };
    userLookupService.getUserByAuthenticationID.mockResolvedValue(existingUser);

    const result = await service.resolveExistingUser(createAgentInfo());

    expect(result?.user).toEqual(existingUser);
    expect(result?.matchedBy).toBe(
      UserAuthenticationLinkMatch.AUTHENTICATION_ID
    );
    expect(result?.outcome).toBe(UserAuthenticationLinkOutcome.ALREADY_LINKED);
  });

  it('links authentication ID when user is found by email', async () => {
    const { service, userLookupService, userRepository } = createService();

    const existingUser = {
      id: 'user-2',
      email: 'user@example.com',
      authenticationID: null,
      agent: { credentials: [] },
    };

    userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
    userLookupService.getUserByEmail.mockResolvedValue(existingUser);

    const result = await service.resolveExistingUser(createAgentInfo());

    expect(userRepository.save).toHaveBeenCalledWith(existingUser);
    expect(result?.outcome).toBe(UserAuthenticationLinkOutcome.LINKED);
    expect(result?.user.authenticationID).toBe('auth-123');
  });

  it('logs mismatch and returns conflict outcome when conflictMode is log and old identity exists', async () => {
    const { service, userLookupService, kratosService, logger } =
      createService();

    const existingUser = {
      id: 'user-3',
      email: 'user@example.com',
      authenticationID: 'other-auth',
      agent: { credentials: [] },
    };

    userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
    userLookupService.getUserByEmail.mockResolvedValue(existingUser);
    // Old identity still exists in Kratos
    kratosService.getIdentityById.mockResolvedValue({ id: 'other-auth' });

    const result = await service.resolveExistingUser(createAgentInfo(), {
      conflictMode: 'log',
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Authentication ID mismatch'),
      expect.any(String),
      LogContext.AUTH
    );
    expect(result?.outcome).toBe(UserAuthenticationLinkOutcome.CONFLICT);
    expect(result?.user.authenticationID).toBe('other-auth');
  });

  it('throws when mismatch occurs and conflictMode is error and old identity exists', async () => {
    const { service, userLookupService, kratosService } = createService();

    const existingUser = {
      id: 'user-4',
      email: 'user@example.com',
      authenticationID: 'other-auth',
      agent: { credentials: [] },
    };

    userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
    userLookupService.getUserByEmail.mockResolvedValue(existingUser);
    // Old identity still exists in Kratos
    kratosService.getIdentityById.mockResolvedValue({ id: 'other-auth' });

    await expect(
      service.resolveExistingUser(createAgentInfo(), {
        conflictMode: 'error',
      })
    ).rejects.toBeInstanceOf(UserAlreadyRegisteredException);
  });

  it('allows relinking when old authentication ID no longer exists in Kratos', async () => {
    const {
      service,
      userLookupService,
      kratosService,
      userRepository,
      logger,
    } = createService();

    const existingUser = {
      id: 'user-relink',
      email: 'user@example.com',
      authenticationID: 'stale-auth',
      agent: { credentials: [] },
    };

    userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
    userLookupService.getUserByEmail.mockResolvedValue(existingUser);
    // Old identity no longer exists in Kratos
    kratosService.getIdentityById.mockResolvedValue(undefined);

    const result = await service.resolveExistingUser(createAgentInfo());

    expect(kratosService.getIdentityById).toHaveBeenCalledWith('stale-auth');
    expect(logger.verbose).toHaveBeenCalledWith(
      expect.stringContaining('no longer exists in Kratos'),
      LogContext.AUTH
    );
    expect(userRepository.save).toHaveBeenCalled();
    expect(result?.outcome).toBe(UserAuthenticationLinkOutcome.LINKED);
    expect(result?.user.authenticationID).toBe('auth-123');
  });

  it('prefers email lookup when requested even if authentication ID belongs to another user', async () => {
    const { service, userLookupService, kratosService, logger } =
      createService();

    const conflictingUser = {
      id: 'user-5',
      email: 'other@example.com',
      authenticationID: 'auth-123',
    };

    const emailUser = {
      id: 'user-6',
      email: 'user@example.com',
      authenticationID: null,
      agent: { credentials: [] },
    };

    userLookupService.getUserByAuthenticationID.mockResolvedValue(
      conflictingUser
    );
    userLookupService.getUserByEmail.mockResolvedValue(emailUser);
    // This test doesn't reach the Kratos check since authenticationID is null
    kratosService.getIdentityById.mockResolvedValue(undefined);

    const result = await service.resolveExistingUser(createAgentInfo(), {
      conflictMode: 'log',
      lookupByAuthenticationId: false,
    });

    expect(result?.user).toEqual(emailUser);
    expect(result?.outcome).toBe(UserAuthenticationLinkOutcome.CONFLICT);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Authentication ID already linked'),
      expect.any(String),
      LogContext.AUTH
    );
  });

  it('returns null when no user exists', async () => {
    const { service, userLookupService } = createService();
    userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
    userLookupService.getUserByEmail.mockResolvedValue(null);

    const result = await service.resolveExistingUser(createAgentInfo());

    expect(result).toBeNull();
  });
});
