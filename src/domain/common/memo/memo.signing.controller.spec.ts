import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { MemoSigningController } from './memo.signing.controller';

describe('MemoSigningController', () => {
  it('streams the actor-bound preview as a private inline PDF', async () => {
    const pdf = Buffer.from('%PDF-preview');
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
    const signingService = { getSnapshot: vi.fn().mockResolvedValue(pdf) };
    const response = { set: vi.fn(), send: vi.fn() };
    const controller = new MemoSigningController(signingService as any);

    await controller.getSnapshot('attempt-1', actor, response as any);

    expect(signingService.getSnapshot).toHaveBeenCalledWith('attempt-1', actor);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="memo-signing-preview.pdf"',
      'Cache-Control': 'private, no-store',
    });
    expect(response.send).toHaveBeenCalledWith(pdf);
  });

  it('uses the ordinary authenticated REST guard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        MemoSigningController.prototype.getSnapshot
      )
    ).toContain(RestGuard);
  });
});
