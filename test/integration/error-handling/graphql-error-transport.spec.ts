import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions/authentication.exception';
import { SessionStoreUnavailableException } from '@common/exceptions/session-store-unavailable.exception';
import {
  GraphqlExceptionFilter,
  isErrorResponseDebugEnabled,
  NEUTRAL_ERROR_MESSAGE,
  sanitizeGraphQLFormattedError,
} from '@core/error-handling';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Context, GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { grantAccessRefusal } from '@test/utils/authorization.refusal';
import { Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import request from 'supertest';
import { vi } from 'vitest';

const TYPE_DEFS = `
  type Query {
    expiredToken: String
    storeDown: String
    refused: String
    fine: String
  }
`;

@Resolver()
class TransportTestResolver {
  @Query()
  expiredToken(): string {
    throw new AuthenticationException(
      'unauthenticated',
      LogContext.AUTH_TOKEN,
      undefined,
      'token_expired'
    );
  }

  @Query()
  storeDown(@Context('res') res: Response): string {
    res.setHeader('Retry-After', '5');
    throw new SessionStoreUnavailableException(LogContext.AUTH);
  }

  @Query()
  refused(): string {
    throw grantAccessRefusal();
  }

  @Query()
  fine(): string {
    return 'ok';
  }
}

const ALLOWED_KEYS = [
  'code',
  'numericCode',
  'userMessage',
  'errorId',
  'error_code',
];

describe('GraphQL error transport', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDebug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = originalDebug;
    }
  });

  const start = async (nodeEnv: string, debug?: string) => {
    process.env.NODE_ENV = nodeEnv;
    if (debug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = debug;
    }
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          // Schema-first: with `isolate: false` the code-first type registry is
          // shared by every spec in the worker, so building it here would
          // compile other specs' types.
          typeDefs: TYPE_DEFS,
          formatError: sanitizeGraphQLFormattedError,
          includeStacktraceInErrorResponses: isErrorResponseDebugEnabled(),
          context: ({ req, res }: { req: unknown; res: unknown }) => ({
            req,
            res,
          }),
        }),
      ],
      providers: [
        TransportTestResolver,
        { provide: APP_FILTER, useClass: GraphqlExceptionFilter },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            verbose: vi.fn(),
            debug: vi.fn(),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  };

  const ask = (field: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({ query: `{ ${field} }` });

  const expectPublicExtensions = (body: any) => {
    for (const key of Object.keys(body.errors[0].extensions)) {
      expect(ALLOWED_KEYS).toContain(key);
    }
    expect(JSON.stringify(body)).not.toContain('"http"');
    expect(JSON.stringify(body)).not.toContain('stacktrace');
  };

  describe.each(['production', 'dev'])('switch unset, NODE_ENV=%s', nodeEnv => {
    beforeEach(() => start(nodeEnv));

    it('answers a refused credential with 401 and its reason code', async () => {
      const response = await ask('expiredToken');

      expect(response.status).toBe(401);
      expect(response.body.errors[0].extensions.code).toBe(
        AlkemioErrorStatus.UNAUTHENTICATED
      );
      expect(response.body.errors[0].extensions.error_code).toBe(
        'token_expired'
      );
      expectPublicExtensions(response.body);
    });

    it('answers an unreachable session store with 503 and Retry-After', async () => {
      const response = await ask('storeDown');

      expect(response.status).toBe(503);
      expect(response.headers['retry-after']).toBe('5');
      expect(response.body.errors[0].extensions.code).toBe(
        AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE
      );
      expectPublicExtensions(response.body);
    });

    it('answers a refusal with 200 and the neutral outcome', async () => {
      const response = await ask('refused');

      expect(response.status).toBe(200);
      expect(response.body.errors[0].message).toBe(NEUTRAL_ERROR_MESSAGE);
      expect(response.body.errors[0].extensions.code).toBe(
        AlkemioErrorStatus.FORBIDDEN_POLICY
      );
      expectPublicExtensions(response.body);
    });

    it('answers a working query', async () => {
      const response = await ask('fine');

      expect(response.status).toBe(200);
      expect(response.body.data.fine).toBe('ok');
    });
  });

  describe('switch on', () => {
    beforeEach(() => start('production', 'true'));

    it.each([
      ['expiredToken', 401, AlkemioErrorStatus.UNAUTHENTICATED],
      ['storeDown', 503, AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE],
      ['refused', 200, AlkemioErrorStatus.FORBIDDEN_POLICY],
    ])('%s keeps its status and code and adds a stack trace', async (field, status, code) => {
      const response = await ask(field);

      expect(response.status).toBe(status);
      const error = response.body.errors[0];
      expect(error.extensions.code).toBe(code);
      expect(error.extensions.stacktrace).toEqual(expect.any(Array));
      expect(JSON.stringify(response.body)).not.toContain('"http"');
      if (field === 'expiredToken') {
        expect(error.extensions.error_code).toBe('token_expired');
      }
      if (field === 'storeDown') {
        expect(response.headers['retry-after']).toBe('5');
      }
    });
  });
});
