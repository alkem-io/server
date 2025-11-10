import { AdminAuthenticationIDBackfillService } from '@src/platform-admin/domain/user/authentication-id-backfill/authentication-id-backfill.service';
import { UserService } from '@domain/community/user/user.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { EntityManager } from 'typeorm';
import { LoggerService } from '@nestjs/common';
import { Identity } from '@ory/kratos-client';
import { LogContext } from '@common/enums';

const createQueryBuilder = () => {
  const builder = {
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  return builder;
};

describe('AdminAuthenticationIDBackfillService (integration)', () => {
  const loggerMock: LoggerService & {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    verbose: jest.Mock;
    debug: jest.Mock;
  } = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
  };

  const createService = () => {
    const userService = {
      createUserFromAgentInfo: jest.fn(),
    } as unknown as UserService;

    const kratosService = {
      getIdentityByEmail: jest.fn(),
    } as unknown as KratosService;

    const agentInfoCacheService = {
      deleteAgentInfoFromCache: jest.fn(),
    } as unknown as AgentInfoCacheService;

    const queryBuilder = createQueryBuilder();

    const entityManager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as EntityManager;

    const service = new AdminAuthenticationIDBackfillService(
      userService,
      kratosService,
      agentInfoCacheService,
      entityManager,
      loggerMock
    );

    return {
      service,
      userService: userService as unknown as {
        createUserFromAgentInfo: jest.Mock;
      },
      kratosService: kratosService as unknown as {
        getIdentityByEmail: jest.Mock;
      },
      agentInfoCacheService: agentInfoCacheService as unknown as {
        deleteAgentInfoFromCache: jest.Mock;
      },
      queryBuilder,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('backfills authentication IDs when Kratos identities exist', async () => {
    const {
      service,
      userService,
      kratosService,
      agentInfoCacheService,
      queryBuilder,
    } = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      authenticationID: null,
    };

    queryBuilder.getMany
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

    userService.createUserFromAgentInfo.mockResolvedValue({
      ...user,
      authenticationID: identity.id,
    });

    const result = await service.backfillAuthenticationIDs();

    expect(result).toEqual({
      processed: 1,
      updated: 1,
      skipped: 0,
      retriedBatches: 0,
    });
    expect(kratosService.getIdentityByEmail).toHaveBeenCalledWith(user.email);
    expect(userService.createUserFromAgentInfo).toHaveBeenCalledTimes(1);
    expect(agentInfoCacheService.deleteAgentInfoFromCache).toHaveBeenCalledWith(
      user.email
    );
    expect(loggerMock.log).toHaveBeenCalledWith(
      expect.stringContaining('Completed authentication ID backfill run'),
      LogContext.AUTH
    );
  });

  it('marks users as skipped when no identity is found', async () => {
    const { service, kratosService, queryBuilder, userService } = createService();

    const user = {
      id: 'user-2',
      email: 'missing@example.com',
      authenticationID: null,
    };

    queryBuilder.getMany
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
    expect(userService.createUserFromAgentInfo).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('No Kratos identity found'),
      LogContext.AUTH
    );
  });
});
