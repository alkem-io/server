import { AlkemioErrorStatus } from '@common/enums';
import { MessageSendLimitReachedException } from '@common/exceptions/message.send.limit.reached.exception';
import { GraphqlExceptionFilter } from '@core/error-handling/graphql.exception.filter';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { type Mock } from 'vitest';
import { MessageSendAllowanceService } from './message.send.allowance.service';

describe('MessageSendAllowanceService', () => {
  let query: Mock;
  let service: MessageSendAllowanceService;

  beforeEach(() => {
    query = vi.fn();
    service = new MessageSendAllowanceService({
      query,
    } as unknown as EntityManager);
  });

  it('makes no query for a count of zero', async () => {
    await service.claim('actor-1', 0, 'sendDirectMessageToUsers');

    expect(query).not.toHaveBeenCalled();
  });

  it('admits when the statement returns a row, passing only the actor and the count', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(
      service.claim('actor-1', 3, 'sendMessageToUsers')
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(['actor-1', 3]);
  });

  it('refuses with the limit exception naming the actor and the action when no row returns', async () => {
    query.mockResolvedValue([]);

    const error = await service
      .claim('actor-1', 1, 'sendMessageToOrganization')
      .then(
        () => undefined,
        (e: unknown) => e
      );

    expect(error).toBeInstanceOf(MessageSendLimitReachedException);
    expect((error as MessageSendLimitReachedException).details).toEqual({
      userId: 'actor-1',
      action: 'sendMessageToOrganization',
    });
  });

  it('fails with the database error itself, never the limit', async () => {
    const dbError = new Error('connection terminated');
    query.mockRejectedValue(dbError);

    await expect(
      service.claim('actor-1', 1, 'sendMessageToCommunityLeads')
    ).rejects.toBe(dbError);
  });

  describe('refusal through the GraphQL exception filter in production', () => {
    let filter: GraphqlExceptionFilter;
    let logger: LoggerService;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [GraphqlExceptionFilter, MockWinstonProvider],
      }).compile();
      filter = module.get(GraphqlExceptionFilter);
      logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
      vi.mocked(logger.error).mockClear();
      vi.mocked(logger.warn).mockClear();
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('returns the code without details and logs one entry naming the actor and the action', async () => {
      query.mockResolvedValue([]);
      const thrown = await service
        .claim('actor-1', 1, 'sendMessageToUsers')
        .then(
          () => undefined,
          (e: MessageSendLimitReachedException) => e
        );
      const host = {
        switchToHttp: () => ({
          getNext: () => ({ req: { user: { actorID: 'request-actor' } } }),
        }),
      };

      const result = filter.catch(thrown!, host as any);

      expect(result.extensions.code).toBe(
        AlkemioErrorStatus.MESSAGE_SEND_LIMIT_REACHED
      );
      expect(result.extensions.details).toBeUndefined();
      expect(logger.error).toHaveBeenCalledOnce();
      const entry = vi.mocked(logger.error).mock.calls[0][0] as unknown as {
        message: string;
        details: unknown;
      };
      expect(entry.message).toBe('You can send up to 20 messages an hour.');
      expect(entry.details).toEqual({
        userId: 'actor-1',
        action: 'sendMessageToUsers',
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
