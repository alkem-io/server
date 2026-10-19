import { EventEmitter } from 'node:events';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
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
    const controller = new MemoPdfController(downloads as any);
    const response = new FakeResponse();
    return { downloads, controller, response };
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

  it.each([
    [new EntityNotFoundException('missing', LogContext.MEMOS), 404],
    [new ForbiddenException('denied', LogContext.MEMOS), 403],
    [
      new ForbiddenAuthorizationPolicyException(
        'denied',
        AuthorizationPrivilege.READ,
        'memo-auth',
        'actor-1'
      ),
      403,
    ],
    [{ code: 'FORBIDDEN_POLICY' }, 403],
  ])('maps %o to HTTP %s with no body', async (error, status) => {
    const { controller, response } = setup(() => Promise.reject(error));

    await controller.download(memoId, actor, response as any);

    expect(response.sendStatus).toHaveBeenCalledWith(status);
    expect(response.set).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
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

  it('maps a rate-limited actor to 429 with the computed Retry-After', async () => {
    const { controller, response } = setup(() =>
      Promise.reject(
        new MemoPdfUnavailableException('rate-limited', {
          retryAfterSeconds: 40,
        })
      )
    );

    await controller.download(memoId, actor, response as any);

    expect(response.set).toHaveBeenCalledWith('Retry-After', '40');
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

  it('does not hide an unexpected failure', async () => {
    const failure = new Error('unexpected');
    const { controller, response } = setup(() => Promise.reject(failure));

    await expect(
      controller.download(memoId, actor, response as any)
    ).rejects.toBe(failure);
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
