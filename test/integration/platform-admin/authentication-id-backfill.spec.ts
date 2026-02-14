import { vi, Mock } from 'vitest';
import { AdminAuthenticationIDBackfillService } from '@src/platform-admin/domain/user/authentication-id-backfill/authentication-id-backfill.service';
import { UserService } from '@domain/community/user/user.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { LoggerService } from '@nestjs/common';
import { Identity } from '@ory/kratos-client';
import { LogContext } from '@common/enums';

describe('AdminAuthenticationIDBackfillService (integration)', () => {
  const loggerMock: LoggerService & {
    log: Mock;
    warn: Mock;
    error: Mock;
    verbose: Mock;
    debug: Mock;
  } = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  };

  const createService = () => {
    const userService = {
      createOrLinkUserFromAgentInfo: vi.fn(),
    } as unknown as UserService;

    const kratosService = {
      getIdentityByEmail: vi.fn(),
    } as unknown as KratosService;

    const agentInfoCacheService = {
      deleteAgentInfoFromCache: vi.fn(),
    } as unknown as AgentInfoCacheService;

    const findMany = vi.fn();
    const db = {
      query: {
        users: {
          findMany,
        },
      },
    };

    const service = new AdminAuthenticationIDBackfillService(
      userService as any,
      kratosService as any,
      agentInfoCacheService as any,
      db as any,
      loggerMock
    );

    return {
      service,
      userService: userService as unknown as {
        createOrLinkUserFromAgentInfo: Mock;
      },
      kratosService: kratosService as unknown as {
        getIdentityByEmail: Mock;
      },
      agentInfoCacheService: agentInfoCacheService as unknown as {
        deleteAgentInfoFromCache: Mock;
      },
      findMany,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('backfills authentication IDs when Kratos identities exist', async () => {
    const {
      service,
      userService,
      kratosService,
      agentInfoCacheService,
      findMany,
    } = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      authenticationID: null,
    };

    findMany
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);

    const identity = {
      id: 'kratos-1',
      traits: {
        email: user.email,
        name: { first: 'Test', last: 'User' },
        picture: 'https://example.com/avatar.png',
      },
      verifiable_addresses: [
        {
          via: 'email',
          verified: true,
        },
      ],
    } as Identity;

    kratosService.getIdentityByEmail.mockResolvedValue(identity);

    userService.createOrLinkUserFromAgentInfo.mockResolvedValue({
      user: {
        ...user,
        authenticationID: identity.id,
      },
      isNew: false,
    });

    const result = await service.backfillAuthenticationIDs();

    expect(result).toEqual({
      processed: 1,
      updated: 1,
      skipped: 0,
      retriedBatches: 0,
    });
    expect(kratosService.getIdentityByEmail).toHaveBeenCalledWith(user.email);
    expect(userService.createOrLinkUserFromAgentInfo).toHaveBeenCalledTimes(1);
    // Cache invalidation now uses authenticationID (identity.id), not email
    expect(agentInfoCacheService.deleteAgentInfoFromCache).toHaveBeenCalledWith(
      identity.id
    );
    expect(loggerMock.log).toHaveBeenCalledWith(
      expect.stringContaining('Completed authentication ID backfill run'),
      LogContext.AUTH
    );
  });

  it('marks users as skipped when no identity is found', async () => {
    const { service, kratosService, findMany, userService } =
      createService();

    const user = {
      id: 'user-2',
      email: 'missing@example.com',
      authenticationID: null,
    };

    findMany
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);

    kratosService.getIdentityByEmail.mockResolvedValue(undefined);

    const result = await service.backfillAuthenticationIDs();

    expect(result).toEqual({
      processed: 1,
      updated: 0,
      skipped: 1,
      retriedBatches: 0,
    });
    expect(userService.createOrLinkUserFromAgentInfo).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('No Kratos identity found'),
      LogContext.AUTH
    );
  });
});
