import { ForbiddenHttpException } from '@common/exceptions/http';
import { ActorContext } from '@core/actor-context/actor.context';
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
