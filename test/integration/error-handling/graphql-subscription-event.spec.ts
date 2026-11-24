import { AddressInfo } from 'node:net';
import { TypedSubscription } from '@common/decorators/typed.subscription';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import {
  GraphqlExceptionFilter,
  NEUTRAL_ERROR_MESSAGE,
  toPublicSubscriptionResult,
} from '@core/error-handling';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Args, GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { grantAccessRefusal } from '@test/utils/authorization.refusal';
import { PubSub } from 'graphql-subscriptions';
import { Client, createClient } from 'graphql-ws';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import WebSocket from 'ws';

const ACTOR_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const POLL_ID = 'c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f';
const TRIGGER = 'pollChanged';

// Schema-first: with `isolate: false` the code-first type registry is shared
// by every spec in the worker, so building it here would compile other specs'
// types.
const TYPE_DEFS = `
  type Query { ping: String }
  type Subscription { pollChanged(kind: String!, refuse: Boolean): String }
`;

type Event = { kind: 'missing' | 'boom' | 'fine' };

const pubSub = new PubSub();

@Resolver()
class SubscriptionTestResolver {
  @Query()
  ping(): string {
    return 'pong';
  }

  @TypedSubscription<Event, { kind: string }>(() => String, {
    filter: (payload, variables) => payload.kind === variables.kind,
    resolve: (payload: Event): any => {
      if (payload.kind === 'missing') {
        throw new EntityNotFoundException(
          'Poll not found',
          LogContext.COLLABORATION,
          { pollId: POLL_ID }
        );
      }
      if (payload.kind === 'boom') {
        throw new Error('boom ARG-MARKER');
      }
      return 'fine';
    },
  })
  pollChanged(
    @Args('kind') _kind: string,
    @Args('refuse', { nullable: true }) refuse?: boolean
  ) {
    if (refuse) throw grantAccessRefusal();
    return pubSub.asyncIterableIterator(TRIGGER);
  }
}

const makeLogger = () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
});

describe('GraphQL subscription event errors', () => {
  const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
  let app: INestApplication;
  let client: Client;
  let logger: ReturnType<typeof makeLogger>;

  afterEach(async () => {
    await client?.dispose();
    await app?.close();
    if (originalDebug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = originalDebug;
    }
  });

  const start = async (debug?: string) => {
    if (debug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = debug;
    }
    logger = makeLogger();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          typeDefs: TYPE_DEFS,
          fieldResolverEnhancers: ['guards', 'filters'],
          context: () => ({ req: { user: { actorID: ACTOR_ID } } }),
          subscriptions: {
            'graphql-ws': {
              onNext: (_ctx, _message, args, result) =>
                toPublicSubscriptionResult(
                  result,
                  logger,
                  (args.contextValue as any)?.req?.user?.actorID
                ),
            },
          },
        }),
      ],
      providers: [
        SubscriptionTestResolver,
        { provide: APP_FILTER, useClass: GraphqlExceptionFilter },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    client = createClient({
      url: `ws://127.0.0.1:${port}/graphql`,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
      lazy: true,
    });
  };

  /** Subscribes and publishes `kind` until the first message arrives. */
  const firstMessage = (query: string, kind: Event['kind']) =>
    new Promise<any>((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      const dispose = client.subscribe(
        { query },
        {
          next: message => {
            clearInterval(timer);
            dispose();
            resolve(message);
          },
          error: error => {
            clearInterval(timer);
            reject(error);
          },
          complete: () => clearInterval(timer),
        }
      );
      timer = setInterval(() => void pubSub.publish(TRIGGER, { kind }), 20);
    });

  const loggedText = () =>
    JSON.stringify([...logger.error.mock.calls, ...logger.warn.mock.calls]);

  describe('with the switch unset', () => {
    beforeEach(() => start());

    it('answers a missing entity in an event with the neutral outcome and logs it once', async () => {
      const message = await firstMessage(
        'subscription { pollChanged(kind: "missing") }',
        'missing'
      );

      expect(message.errors).toHaveLength(1);
      const [error] = message.errors;
      expect(error.message).toBe(NEUTRAL_ERROR_MESSAGE);
      expect(error.extensions.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
      for (const key of Object.keys(error.extensions)) {
        expect(['code', 'numericCode', 'userMessage', 'errorId']).toContain(
          key
        );
      }
      expect(error.path).toEqual(['pollChanged']);
      expect(error.locations.length).toBeGreaterThan(0);
      expect(
        JSON.stringify(message).replace(error.extensions.errorId, '')
      ).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
      );
      expect(logger.error).toHaveBeenCalledOnce();
      expect(logger.error.mock.calls[0][0]).toEqual({
        errorId: error.extensions.errorId,
        exceptionName: 'EntityNotFoundException',
        code: 'ENTITY_NOT_FOUND',
        operation: 'subscription event',
        field: 'pollChanged',
        actorID: ACTOR_ID,
      });
    });

    it('keeps the path of an aliased field and logs the schema name', async () => {
      const message = await firstMessage(
        'subscription { ARG_MARKER: pollChanged(kind: "missing") }',
        'missing'
      );

      expect(message.errors[0].path).toEqual(['ARG_MARKER']);
      expect(logger.error.mock.calls[0][0].field).toBe('pollChanged');
      expect(loggedText()).not.toContain('ARG_MARKER');
    });

    it('answers an unexpected failure in an event with the unspecified text', async () => {
      const message = await firstMessage(
        'subscription { pollChanged(kind: "boom") }',
        'boom'
      );

      const [error] = message.errors;
      expect(error.extensions.code).toBe(AlkemioErrorStatus.UNSPECIFIED);
      expect(error.message).toBe('Internal Server Error');
      expect(JSON.stringify(message)).not.toContain('boom');
      expect(loggedText()).not.toContain('boom');
      expect(loggedText()).not.toContain('ARG-MARKER');
    });

    it('delivers a working event unchanged and logs nothing', async () => {
      const message = await firstMessage(
        'subscription { pollChanged(kind: "fine") }',
        'fine'
      );

      expect(message).toEqual({ data: { pollChanged: 'fine' } });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('leaves a refused subscription to the filter, with one log call', async () => {
      // A refusal while subscribing ends the socket; outside production its
      // close reason is the message of the error the filter built.
      const closed = await firstMessage(
        'subscription { pollChanged(kind: "fine", refuse: true) }',
        'fine'
      ).catch(event => event);

      expect(closed.reason).toBe(NEUTRAL_ERROR_MESSAGE);
      expect(logger.error).toHaveBeenCalledOnce();
      expect(logger.error.mock.calls[0][0].code).toBe(
        AlkemioErrorStatus.FORBIDDEN_POLICY
      );
    });
  });

  describe('with the switch on', () => {
    beforeEach(() => start('true'));

    it.each([
      ['missing', AlkemioErrorStatus.FORBIDDEN_POLICY, NEUTRAL_ERROR_MESSAGE],
      ['boom', AlkemioErrorStatus.UNSPECIFIED, 'Internal Server Error'],
    ] as const)('keeps code and message of %s and adds the stack', async (kind, code, text) => {
      const message = await firstMessage(
        `subscription { pollChanged(kind: "${kind}") }`,
        kind
      );

      const [error] = message.errors;
      expect(error.extensions.code).toBe(code);
      expect(error.message).toBe(text);
      expect(error.extensions.stacktrace).toEqual(expect.any(Array));
    });
  });
});
