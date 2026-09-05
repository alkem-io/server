import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ContentSigningController } from './content.signing.controller';
import { ContentSigningReturnFilter } from './content.signing.return.filter';

describe('ContentSigningController', () => {
  // trust-gateway 4f0691a produces an opaque hex correlation ID, not a UUID.
  const correlationId = '0123456789abcdef0123456789abcdef';

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
    [
      new ForbiddenAuthorizationPolicyException(
        'memo access denied',
        AuthorizationPrivilege.CONTRIBUTE,
        'memo-auth',
        'actor-1'
      ),
      403,
    ],
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

  it('completes a browser return with no-store/no-referrer and only the attempt ID', async () => {
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
    const signingService = {
      completeMemoSigning: vi.fn().mockResolvedValue({
        memoUrl: '/space/demo/callout/memo',
        attemptId: 'attempt-1',
        status: 'signed',
      }),
    };
    const response = { set: vi.fn(), redirect: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await controller.complete(
      correlationId,
      'raw-client-state',
      actor,
      response as any
    );

    expect(signingService.completeMemoSigning).toHaveBeenCalledWith(
      correlationId,
      'raw-client-state',
      actor
    );
    expect(response.set).toHaveBeenCalledWith({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      '/space/demo/callout/memo?signingAttemptId=attempt-1'
    );
  });

  it.each([
    [new ForbiddenException('wrong return', LogContext.MEMOS), 403],
    [
      new ForbiddenAuthorizationPolicyException(
        'memo access denied',
        AuthorizationPrivilege.CONTRIBUTE,
        'memo-auth',
        'actor-1'
      ),
      403,
    ],
    [new ValidationException('still pending', LogContext.MEMOS), 409],
  ])('maps an authenticated return failure to HTTP %s', async (error, status) => {
    const signingService = {
      completeMemoSigning: vi.fn().mockRejectedValue(error),
    };
    const response = { set: vi.fn(), sendStatus: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await controller.complete(
      correlationId,
      'state',
      Object.assign(new ActorContext(), { actorID: 'actor-1' }),
      response as any
    );

    expect(response.sendStatus).toHaveBeenCalledWith(status);
  });

  it('routes an absent actor through the signing login-restoration filter', async () => {
    const signingService = { completeMemoSigning: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await expect(
      controller.complete(
        correlationId,
        'state',
        undefined as unknown as ActorContext,
        {} as any
      )
    ).rejects.toThrow(/signing return requires/i);
    expect(signingService.completeMemoSigning).not.toHaveBeenCalled();
  });

  it('declares the public completion route with its guard and filter', () => {
    expect(RestEndpoint.CONTENT_SIGNING_COMPLETE).toBe('complete');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ContentSigningController.prototype.complete
      )
    ).toBe(RestEndpoint.CONTENT_SIGNING_COMPLETE);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ContentSigningController.prototype.complete
      )
    ).toContain(RestGuard);
    expect(
      Reflect.getMetadata(
        EXCEPTION_FILTERS_METADATA,
        ContentSigningController.prototype.complete
      )
    ).toContain(ContentSigningReturnFilter);
  });

  it.each([
    ['missing correlation ID', undefined, 'state'],
    ['duplicated correlation ID', [correlationId, correlationId], 'state'],
    ['empty correlation ID', '', 'state'],
    ['missing client state', correlationId, undefined],
    ['duplicated client state', correlationId, ['state', 'state']],
    ['empty client state', correlationId, ''],
  ])('rejects %s before calling the signing service', async (_, correlation, state) => {
    const signingService = { completeMemoSigning: vi.fn() };
    const response = { set: vi.fn(), sendStatus: vi.fn() };
    const controller = new ContentSigningController(signingService as any);

    await controller.complete(
      correlation as unknown as string,
      state as unknown as string,
      Object.assign(new ActorContext(), { actorID: 'actor-1' }),
      response as any
    );

    expect(response.sendStatus).toHaveBeenCalledWith(409);
    expect(signingService.completeMemoSigning).not.toHaveBeenCalled();
  });
});
