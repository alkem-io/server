import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthenticationException } from '@common/exceptions/authentication.exception';
import { BaseException } from '@common/exceptions/base.exception';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { SecondFactorRequiredException } from '@common/exceptions/second.factor.required.exception';
import { SessionStoreUnavailableException } from '@common/exceptions/session-store-unavailable.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { CalloutFormErrorCode } from '@domain/collaboration/callout-form/callout.form.error.codes';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import {
  grantAccessRefusal,
  policyGranting,
  testActor,
} from '@test/utils/authorization.refusal';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Mock } from 'vitest';
import { GraphqlExceptionFilter } from './graphql.exception.filter';
import { NEUTRAL_ERROR_MESSAGE } from './public.error.result';

const PUBLIC_KEYS = [
  'code',
  'numericCode',
  'userMessage',
  'errorId',
  'details',
];
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('GraphqlExceptionFilter', () => {
  let filter: GraphqlExceptionFilter;
  let logger: LoggerService;

  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
  const setMode = (nodeEnv: string, debug?: string) => {
    process.env.NODE_ENV = nodeEnv;
    if (debug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = debug;
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphqlExceptionFilter, MockWinstonProvider],
    }).compile();

    filter = module.get(GraphqlExceptionFilter);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDebug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = originalDebug;
    }
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  const createMockHost = (userId?: string) => ({
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn().mockReturnValue({
      getNext: vi.fn().mockReturnValue({
        req: {
          user: { actorID: userId ?? 'test-user-id' },
        },
      }),
    }),
  });

  /** Hosts as the filter sees them for each GraphQL operation type. */
  const operationHosts = {
    query: () => createMockHost('query-actor'),
    mutation: () => createMockHost('mutation-actor'),
    subscription: () => ({
      getType: vi.fn().mockReturnValue('graphql'),
      switchToHttp: vi.fn().mockReturnValue({
        getNext: vi.fn().mockReturnValue({
          req: { user: { actorID: 'subscription-actor' } },
          connectionParams: {},
        }),
      }),
    }),
  };
  const hostKinds = Object.keys(operationHosts) as Array<
    keyof typeof operationHosts
  >;

  const withoutErrorId = (error: GraphQLError) => {
    const { errorId: _errorId, ...extensions } = error.extensions;
    return { message: error.message, extensions };
  };

  it('should log the exception with userId from actorID', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN
    );
    const host = createMockHost('user-123');

    filter.catch(exception, host as any);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(exception.details?.userId).toBe('user-123');
  });

  it('should use userId from exception details if present', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN,
      { userId: 'detail-user' }
    );
    const host = createMockHost('actor-user');

    filter.catch(exception, host as any);

    expect(exception.details?.userId).toBe('detail-user');
  });

  it('should use "unknown" when no userId is available', () => {
    const exception = new BaseException(
      'test error',
      LogContext.AUTH,
      AlkemioErrorStatus.FORBIDDEN
    );
    const host = {
      switchToHttp: vi.fn().mockReturnValue({
        getNext: vi.fn().mockReturnValue({
          req: {
            user: { actorID: undefined },
          },
        }),
      }),
    };

    filter.catch(exception, host as any);

    expect(exception.details?.userId).toBe('unknown');
  });

  describe.each(hostKinds)('public shape on a %s', kind => {
    it('carries only the public keys with the switch unset and NODE_ENV=dev', () => {
      setMode('dev');
      const exception = new ValidationException(
        'bad',
        LogContext.COLLABORATION,
        { code: 'SOMETHING_INTERNAL', cause: 'secret' }
      );

      const result = filter.catch(
        exception,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(result).toBeInstanceOf(GraphQLError);
      expect(result).not.toBe(exception);
      for (const key of Object.keys(result.extensions)) {
        expect(PUBLIC_KEYS).toContain(key);
      }
      expect(result.originalError).toBeUndefined();
      expect(result.extensions).toEqual({
        code: AlkemioErrorStatus.BAD_USER_INPUT,
        numericCode: exception.extensions.numericCode,
        userMessage: exception.extensions.userMessage,
        errorId: exception.errorId,
      });
    });

    it('keeps an allow-listed form reason code under details', () => {
      setMode('dev');
      const exception = new ValidationException(
        'Form answer required',
        LogContext.COLLABORATION,
        {
          code: CalloutFormErrorCode.FORM_ANSWER_REQUIRED,
          questionIDs: ['q1', 'q2'],
          cause: 'internal',
        }
      );

      const result = filter.catch(
        exception,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(result.extensions.details).toEqual({
        code: 'FORM_ANSWER_REQUIRED',
        questionIDs: ['q1', 'q2'],
      });
    });

    it('keeps only the form code when there are no question ids', () => {
      setMode('production');
      const exception = new ValidationException(
        'Form visibility changed',
        LogContext.COLLABORATION,
        { code: CalloutFormErrorCode.FORM_VISIBILITY_CHANGED }
      );

      const result = filter.catch(
        exception,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(result.extensions.details).toEqual({
        code: 'FORM_VISIBILITY_CHANGED',
      });
    });

    it('removes a UUID from a kept message', () => {
      setMode('dev');
      const id = 'C0FFEE00-1234-4ABC-9DEF-0123456789AB';
      const exception = new ValidationException(
        `Value ${id} is not accepted here`,
        LogContext.COLLABORATION
      );

      const result = filter.catch(
        exception,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(result.extensions.code).toBe(AlkemioErrorStatus.BAD_USER_INPUT);
      expect(result.message).toBe('Value is not accepted here');
      expect(result.message).not.toMatch(UUID);
    });

    it('adds the original stack and full details with the switch on', () => {
      setMode('production', 'true');
      const exception = new ValidationException(
        'bad',
        LogContext.COLLABORATION,
        { code: 'SOMETHING_INTERNAL', cause: 'secret' }
      );

      const result = filter.catch(
        exception,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(result.message).toBe('bad');
      expect(result.extensions.code).toBe(AlkemioErrorStatus.BAD_USER_INPUT);
      expect(result.extensions.stacktrace).toEqual(
        String(exception.stack).split('\n')
      );
      expect(result.extensions.details).toEqual(
        expect.objectContaining({ code: 'SOMETHING_INTERNAL', cause: 'secret' })
      );
    });
  });

  describe('transport of a failed authentication', () => {
    describe.each([
      ['dev', undefined],
      ['production', undefined],
      ['dev', 'true'],
    ])('NODE_ENV=%s, switch=%s', (nodeEnv, debug) => {
      beforeEach(() => setMode(nodeEnv, debug));

      it('keeps the 401 status and the reason code', () => {
        const result = filter.catch(
          new AuthenticationException(
            'unauthenticated',
            LogContext.AUTH_TOKEN,
            undefined,
            'token_expired'
          ),
          createMockHost() as any
        ) as GraphQLError;

        expect(result.extensions.http).toEqual({ status: 401 });
        expect(result.extensions.error_code).toBe('token_expired');
        expect(result.extensions.code).toBe(AlkemioErrorStatus.UNAUTHENTICATED);
      });

      it('has no reason code when none was given', () => {
        const result = filter.catch(
          new AuthenticationException('unauthenticated', LogContext.AUTH_TOKEN),
          createMockHost() as any
        ) as GraphQLError;

        expect(result.extensions.http).toEqual({ status: 401 });
        expect('error_code' in result.extensions).toBe(false);
      });

      it('keeps the 503 status of an unreachable session store', () => {
        const result = filter.catch(
          new SessionStoreUnavailableException(LogContext.AUTH),
          createMockHost() as any
        ) as GraphQLError;

        expect(result.extensions.http).toEqual({ status: 503 });
      });

      it('sets no transport status for a second-factor refusal', () => {
        const result = filter.catch(
          new SecondFactorRequiredException(),
          createMockHost() as any
        ) as GraphQLError;

        expect(result.extensions.http).toBeUndefined();
        expect(result.extensions.code).toBe(
          AlkemioErrorStatus.SECOND_FACTOR_REQUIRED
        );
      });

      it('passes no other extension key and no malformed transport value', () => {
        const exception = new BaseException(
          'odd',
          LogContext.AUTH,
          AlkemioErrorStatus.UNAUTHENTICATED
        );
        const extensions = exception.extensions as Record<string, unknown>;
        extensions.internalNote = 'private';
        extensions.http = { status: '401', headers: new Map([['x', 'y']]) };
        extensions.error_code = 42;

        const result = filter.catch(
          exception,
          createMockHost() as any
        ) as GraphQLError;

        expect(result.extensions.internalNote).toBeUndefined();
        expect(result.extensions.http).toBeUndefined();
        expect(result.extensions.error_code).toBeUndefined();
      });
    });
  });

  describe('a refusal from grantAccessOrFail', () => {
    const actorID = 'a7f0c1d2-3e4f-4a5b-8c6d-7e8f9a0b1c2d';
    const policyID = 'b1c2d3e4-f5a6-4b7c-9d8e-0f1a2b3c4d5e';
    const refusal = () =>
      grantAccessRefusal(
        AuthorizationPrivilege.DELETE,
        'delete post',
        testActor(actorID),
        policyGranting([], policyID, AuthorizationPolicyType.POST)
      );

    it('answers with the neutral sentence and logs the composed reason', () => {
      setMode('production');

      const result = filter.catch(
        refusal(),
        createMockHost() as any
      ) as GraphQLError;

      expect(result.message).toBe(NEUTRAL_ERROR_MESSAGE);
      expect(result.extensions.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
      const serialized = JSON.stringify({
        message: result.message,
        extensions: result.extensions,
      });
      for (const hidden of [
        actorID,
        policyID,
        `'${AuthorizationPolicyType.POST}'`,
        `'${AuthorizationPrivilege.DELETE}'`,
        'delete post',
      ]) {
        expect(serialized).not.toContain(hidden);
      }

      const logged = JSON.stringify((logger.error as Mock).mock.calls[0]);
      for (const shown of [
        actorID,
        policyID,
        `'${AuthorizationPolicyType.POST}'`,
        `'${AuthorizationPrivilege.DELETE}'`,
        'delete post',
        String(result.extensions.errorId),
      ]) {
        expect(logged).toContain(shown);
      }
    });

    it('keeps code and message with the switch on', () => {
      setMode('dev', 'true');

      const result = filter.catch(
        refusal(),
        createMockHost() as any
      ) as GraphQLError;

      expect(result.message).toBe(NEUTRAL_ERROR_MESSAGE);
      expect(result.extensions.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
    });
  });

  describe.each(hostKinds)('missing versus refused on a %s', kind => {
    const entityID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70';

    it.each([
      [
        'a missing post',
        () =>
          new EntityNotFoundException(
            `Not able to locate post with the specified ID: ${entityID}`,
            LogContext.COLLABORATION
          ),
      ],
      [
        'a missing actor',
        () =>
          new EntityNotFoundException('Actor not found', LogContext.COMMUNITY, {
            actorID: entityID,
          }),
      ],
    ])('%s and a refusal project to the same error', (_name, missing) => {
      setMode('production');
      const notFound = missing();
      const refused = grantAccessRefusal(AuthorizationPrivilege.READ);

      const a = filter.catch(
        notFound,
        operationHosts[kind]() as any
      ) as GraphQLError;
      const b = filter.catch(
        refused,
        operationHosts[kind]() as any
      ) as GraphQLError;

      expect(withoutErrorId(a)).toEqual(withoutErrorId(b));
      expect(JSON.stringify(withoutErrorId(a))).not.toContain(entityID);
      expect(a.extensions.errorId).toBe(notFound.errorId);
      expect(b.extensions.errorId).toBe(refused.errorId);

      const [first, second] = (logger.error as Mock).mock.calls.map(
        call => call[0]
      );
      expect(first.code).toBe(AlkemioErrorStatus.ENTITY_NOT_FOUND);
      expect(first.exceptionName).toBe('EntityNotFoundException');
      expect(second.code).toBe(AlkemioErrorStatus.FORBIDDEN_POLICY);
      expect(second.exceptionName).toBe(
        'ForbiddenAuthorizationPolicyException'
      );
    });
  });
});
