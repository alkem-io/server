import { EventEmitter } from 'node:events';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import {
  computeNumericCode,
  getMetadataForStatus,
} from '@common/exceptions/error.status.metadata';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { NEUTRAL_ERROR_MESSAGE } from '@core/error-handling/public.error.result';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { StorageServiceUnavailableException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { MemoPdfController } from './memo.pdf.controller';

class FakeResponse extends EventEmitter {
  writableFinished = false;
  readonly set = vi.fn(() => this);
  readonly status = vi.fn(() => this);
  readonly json = vi.fn(() => this);
  readonly send = vi.fn(() => this);
  readonly sendStatus = vi.fn(() => this);
}

describe('MemoPdfController', () => {
  const memoId = '11111111-1111-4111-8111-111111111111';
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const pdf = Buffer.from('%PDF-1.7');

  const setup = (download: (...args: any[]) => Promise<unknown>) => {
    const downloads = { download: vi.fn(download) };
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controller = new MemoPdfController(downloads as any, logger as any);
    const response = new FakeResponse();
    return { downloads, controller, response, logger };
  };

  it('uses the private REST route under rest/memo with the REST guard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MemoPdfController)).toBe(
      'rest/memo'
    );
    expect(RestEndpoint.MEMO_PDF).toBe(':memoId/pdf');
    expect(
      Reflect.getMetadata(PATH_METADATA, MemoPdfController.prototype.download)
    ).toBe(':memoId/pdf');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MemoPdfController.prototype.download)
    ).toEqual([RestGuard]);
  });

  it('answers 401 to an anonymous request without calling the service', async () => {
    const { downloads, controller, response } = setup(async () => ({}));

    await controller.download(
      memoId,
      undefined as unknown as ActorContext,
      response as any
    );

    expect(response.sendStatus).toHaveBeenCalledWith(401);
    expect(downloads.download).not.toHaveBeenCalled();
  });

  it('sends the whole PDF as a private attachment named by the service', async () => {
    const { downloads, controller, response } = setup(async () => ({
      pdf,
      filename: 'board-decision-q4-2026-10-19.pdf',
    }));

    await controller.download(memoId, actor, response as any);

    expect(downloads.download).toHaveBeenCalledWith(
      memoId,
      actor,
      expect.any(AbortSignal)
    );
    expect(response.set).toHaveBeenCalledOnce();
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="board-decision-q4-2026-10-19.pdf"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(response.send).toHaveBeenCalledWith(pdf);
  });

  describe('a memo that is missing or refused', () => {
    const neutral = getMetadataForStatus(AlkemioErrorStatus.FORBIDDEN_POLICY);
    const cases = () =>
      [
        [
          'missing',
          new EntityNotFoundException(
            `Memo ${memoId} not found`,
            LogContext.MEMOS
          ),
        ],
        ['forbidden', new ForbiddenException('denied', LogContext.MEMOS)],
        [
          'refused',
          new ForbiddenAuthorizationPolicyException(
            `denied ${memoId}`,
            AuthorizationPrivilege.READ,
            'memo-auth',
            'actor-1'
          ),
        ],
        ['coded', { code: 'FORBIDDEN_POLICY' }],
      ] as const;

    it('answers each with 404 and the same neutral body, and logs which it was', async () => {
      const bodies: any[] = [];
      for (const [, error] of cases()) {
        const { controller, response, logger } = setup(() =>
          Promise.reject(error)
        );

        await controller.download(memoId, actor, response as any);

        expect(response.status).toHaveBeenCalledWith(404);
        expect(response.sendStatus).not.toHaveBeenCalled();
        const body = (response.json.mock.calls[0] as any[])[0];
        expect(body).toEqual({
          statusCode: 404,
          code: AlkemioErrorStatus.FORBIDDEN_POLICY,
          numericCode: computeNumericCode(neutral),
          userMessage: neutral.userMessage,
          message: NEUTRAL_ERROR_MESSAGE,
          errorId: expect.any(String),
          timestamp: expect.any(String),
        });
        expect(JSON.stringify(body)).not.toContain(memoId);
        expect(logger.error).toHaveBeenCalledOnce();
        const entry = logger.error.mock.calls[0][0];
        expect(entry).toMatchObject({
          errorId: body.errorId,
          operation: 'memo pdf download',
          actorID: actor.actorID,
        });
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(memoId);
        expect(entry).not.toHaveProperty('message');
        const { errorId: _e, timestamp: _t, ...rest } = body;
        bodies.push({ rest, entry });
      }
      for (const { rest } of bodies) expect(rest).toEqual(bodies[0].rest);
      expect(bodies.slice(0, 3).map(b => b.entry.exceptionName)).toEqual([
        'EntityNotFoundException',
        'ForbiddenException',
        'ForbiddenAuthorizationPolicyException',
      ]);
      expect(bodies.slice(0, 3).map(b => b.entry.code)).toEqual([
        'ENTITY_NOT_FOUND',
        'FORBIDDEN',
        'FORBIDDEN_POLICY',
      ]);
    });
  });

  it('maps a validation failure to 422 with its neutral message', async () => {
    const { controller, response } = setup(() =>
      Promise.reject(
        new ValidationException(
          'Memo PDF supports at most 20 images',
          LogContext.MEMOS
        )
      )
    );

    await controller.download(memoId, actor, response as any);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Memo PDF supports at most 20 images',
    });
  });

  it('maps a busy actor to 429 with Retry-After', async () => {
    const { controller, response } = setup(() =>
      Promise.reject(new MemoPdfUnavailableException('busy-actor'))
    );

    await controller.download(memoId, actor, response as any);

    expect(response.set).toHaveBeenCalledWith('Retry-After', '5');
    expect(response.sendStatus).toHaveBeenCalledWith(429);
  });

  it.each([
    'busy-global',
    'deadline',
    'crashed',
    'launch-failed',
    'source-unavailable',
  ] as const)('maps %s to 503 with Retry-After', async reason => {
    const { controller, response } = setup(() =>
      Promise.reject(new MemoPdfUnavailableException(reason))
    );

    await controller.download(memoId, actor, response as any);

    expect(response.set).toHaveBeenCalledWith('Retry-After', '5');
    expect(response.sendStatus).toHaveBeenCalledWith(503);
  });

  it.each([
    ['a plain error', new Error('unexpected')],
    [
      'an unmapped BaseException',
      new StorageServiceUnavailableException('File service unavailable'),
    ],
  ])('answers 500 and logs %s instead of rethrowing it', async (_label, failure) => {
    const { controller, response, logger } = setup(() =>
      Promise.reject(failure)
    );

    await expect(
      controller.download(memoId, actor, response as any)
    ).resolves.toBe(response);

    expect(response.sendStatus).toHaveBeenCalledWith(500);
    expect(response.send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Object),
      failure.stack,
      LogContext.MEMOS
    );
  });

  it('cancels the render when the client disconnects before the response finished', async () => {
    let signal: AbortSignal | undefined;
    let finishRender: (value: unknown) => void = () => {};
    const { controller, response } = setup((_id, _actor, received) => {
      signal = received;
      return new Promise(resolve => {
        finishRender = resolve;
      });
    });

    const handling = controller.download(memoId, actor, response as any);
    response.emit('close');
    expect(signal?.aborted).toBe(true);

    finishRender({ pdf, filename: 'memo-2026-10-19.pdf' });
    await handling;
    expect(response.set).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  it('writes nothing after a disconnect that ended the render with an error', async () => {
    let fail: (error: unknown) => void = () => {};
    const { controller, response } = setup(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        })
    );

    const handling = controller.download(memoId, actor, response as any);
    response.emit('close');
    fail(new Error('Memo PDF render cancelled'));

    await expect(handling).resolves.toBeUndefined();
    expect(response.sendStatus).not.toHaveBeenCalled();
    expect(response.set).not.toHaveBeenCalled();
  });

  it('does not cancel when the close event follows a finished response', async () => {
    let signal: AbortSignal | undefined;
    const { controller, response } = setup(async (_id, _actor, received) => {
      signal = received;
      return { pdf, filename: 'memo-2026-10-19.pdf' };
    });

    await controller.download(memoId, actor, response as any);
    response.writableFinished = true;
    response.emit('close');

    expect(signal?.aborted).toBe(false);
  });
});
