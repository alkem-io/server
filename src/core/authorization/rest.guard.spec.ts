import {
  ForbiddenHttpException,
  UnauthenticatedHttpException,
} from '@common/exceptions/http';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  BearerValidationError,
  CookieSessionInvalidError,
  SecondFactorRequiredError,
} from '@core/auth/oidc/strategies/auth.errors';
import { SecondFactorRequiredHttpException } from '@core/auth/second-factor/second-factor-required.http.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { RestGuard } from './rest.guard';

describe('RestGuard', () => {
  let guard: RestGuard;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RestGuard, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    guard = module.get(RestGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return actorContext when no error', () => {
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      const result = guard.handleRequest(
        null,
        actorContext,
        null,
        null,
        undefined
      );

      expect(result).toBe(actorContext);
    });

    it('should throw ForbiddenHttpException when error is present', () => {
      const error = new Error('Authentication failed');
      const actorContext = new ActorContext();

      expect(() =>
        guard.handleRequest(error, actorContext, null, null, undefined)
      ).toThrow(ForbiddenHttpException);
    });

    it('should use error message in exception', () => {
      const error = new Error('Token expired');

      expect(() =>
        guard.handleRequest(error, new ActorContext(), null, null, undefined)
      ).toThrow('Token expired');
    });

    it('should handle non-Error err objects', () => {
      const err = 'string error';

      expect(() =>
        guard.handleRequest(err, new ActorContext(), null, null, undefined)
      ).toThrow(ForbiddenHttpException);
    });
  });
});

describe('RestGuard.handleRequest — a sign-in refused for its second factor', () => {
  const guard = new RestGuard({} as never);
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const context = {
    switchToHttp: () => ({ getResponse: () => res }),
  };

  it('answers 403 second_factor_required, not the generic forbidden, and keeps the cookie', () => {
    const error = (() => {
      try {
        guard.handleRequest(
          new SecondFactorRequiredError(),
          new ActorContext(),
          null,
          context
        );
      } catch (e) {
        return e;
      }
    })() as SecondFactorRequiredHttpException;

    expect(error).toBeInstanceOf(SecondFactorRequiredHttpException);
    expect(error).not.toBeInstanceOf(ForbiddenHttpException);
    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toEqual({
      statusCode: 403,
      error_code: 'second_factor_required',
    });
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it.each([
    ['a rejected session', new CookieSessionInvalidError('subject_revoked')],
    ['an invalid bearer', new BearerValidationError('token_expired')],
  ])('still answers 401 for %s', (_label, err) => {
    expect(() =>
      guard.handleRequest(err, new ActorContext(), null, context)
    ).toThrow(UnauthenticatedHttpException);
  });

  it('still answers the generic forbidden for any other strategy error', () => {
    expect(() =>
      guard.handleRequest(new Error('boom'), new ActorContext(), null, context)
    ).toThrow(ForbiddenHttpException);
  });
});
