import { LogContext } from '@common/enums';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ContentSigningController } from './content.signing.controller';

describe('ContentSigningController', () => {
  it('streams the actor-bound preview as a private inline PDF', async () => {
    const pdf = Buffer.from('%PDF-preview');
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
    const signingService = { getSnapshot: vi.fn().mockResolvedValue(pdf) };
    const response = { set: vi.fn(), send: vi.fn(), sendStatus: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await controller.getSnapshot('attempt-1', actor, response as any);

    expect(signingService.getSnapshot).toHaveBeenCalledWith('attempt-1', actor);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="memo-signing-preview.pdf"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(response.send).toHaveBeenCalledWith(pdf);
  });

  it('returns 401 for an anonymous request without calling the service', async () => {
    const signingService = { getSnapshot: vi.fn() };
    const response = { sendStatus: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await controller.getSnapshot(
      'attempt-1',
      undefined as unknown as ActorContext,
      response as any
    );

    expect(response.sendStatus).toHaveBeenCalledWith(401);
    expect(signingService.getSnapshot).not.toHaveBeenCalled();
  });

  it.each([
    [new ForbiddenException('denied', LogContext.MEMOS), 403],
    [new ValidationException('not ready', LogContext.MEMOS), 409],
  ])('maps an authenticated domain failure to HTTP %s', async (error, status) => {
    const signingService = { getSnapshot: vi.fn().mockRejectedValue(error) };
    const response = { sendStatus: vi.fn() };
    const controller = new ContentSigningController(signingService as any);
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });

    await controller.getSnapshot('attempt-1', actor, response as any);

    expect(response.sendStatus).toHaveBeenCalledWith(status);
  });

  it('does not hide an unexpected service failure', async () => {
    const failure = new Error('unexpected');
    const signingService = {
      getSnapshot: vi.fn().mockRejectedValue(failure),
    };
    const controller = new ContentSigningController(signingService as any);
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });

    await expect(
      controller.getSnapshot('attempt-1', actor, {} as any)
    ).rejects.toBe(failure);
  });

  it('uses the shared private REST route and guard', () => {
    expect(RestEndpoint.CONTENT_SIGNING_SNAPSHOT).toBe(':attemptId/snapshot');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ContentSigningController.prototype.getSnapshot
      )
    ).toBe(RestEndpoint.CONTENT_SIGNING_SNAPSHOT);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ContentSigningController.prototype.getSnapshot
      )
    ).toContain(RestGuard);
  });
});
