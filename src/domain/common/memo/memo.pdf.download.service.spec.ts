import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import * as Y from 'yjs';
import { MemoPdfDownloadService } from './memo.pdf.download.service';

describe('MemoPdfDownloadService', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const pdf = Buffer.from('%PDF-1.7');
  const liveDoc = new Y.Doc();
  liveDoc.getText('probe').insert(0, 'live');
  const memo = {
    id: 'memo-1',
    authorization: { id: 'memo-auth' },
    profile: {
      displayName: 'Board decision — Q4',
      storageBucket: { id: 'bucket-1' },
    },
  };

  const setup = () => {
    const memoService = { getMemoOrFail: vi.fn().mockResolvedValue(memo) };
    const authorizationService = { grantAccessOrFail: vi.fn() };
    const collaborationDocumentService = {
      read: vi.fn(async (_id, _type, _actor, reader) => reader(liveDoc)),
    };
    const renderer = { render: vi.fn().mockResolvedValue(pdf) };
    const logger = { warn: vi.fn() };
    const service = new MemoPdfDownloadService(
      memoService as any,
      authorizationService as any,
      collaborationDocumentService as any,
      renderer as any,
      logger as any
    );
    return {
      service,
      memoService,
      authorizationService,
      collaborationDocumentService,
      renderer,
      logger,
    };
  };

  afterEach(() => vi.useRealTimers());

  it('renders the live memo state and names the file from the title and the UTC date', async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-10-19T12:00:00Z'),
    });
    const {
      service,
      memoService,
      authorizationService,
      collaborationDocumentService,
      renderer,
    } = setup();
    const abort = new AbortController();

    const result = await service.download('memo-1', actor, abort.signal);

    expect(result).toEqual({
      pdf,
      filename: 'board-decision-q4-2026-10-19.pdf',
    });
    expect(memoService.getMemoOrFail).toHaveBeenCalledWith('memo-1', {
      relations: { authorization: true, profile: { storageBucket: true } },
    });
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      memo.authorization,
      AuthorizationPrivilege.READ,
      'download memo pdf: memo-1'
    );
    expect(collaborationDocumentService.read).toHaveBeenCalledWith(
      'memo-1',
      'memo',
      'actor-1',
      expect.any(Function)
    );
    expect(renderer.render).toHaveBeenCalledWith(
      Buffer.from(Y.encodeStateAsUpdateV2(liveDoc)),
      'bucket-1',
      actor,
      { signal: abort.signal, memoId: 'memo-1', purpose: 'download' }
    );
  });

  it('passes no bucket when the memo profile has none', async () => {
    const { service, memoService, renderer } = setup();
    memoService.getMemoOrFail.mockResolvedValue({
      ...memo,
      profile: { displayName: 'No images' },
    });

    await service.download('memo-1', actor);

    expect(renderer.render.mock.calls[0][1]).toBeUndefined();
  });

  it('stops at an unknown memo before reading or rendering anything', async () => {
    const { service, memoService, collaborationDocumentService, renderer } =
      setup();
    const missing = new EntityNotFoundException('missing', LogContext.MEMOS);
    memoService.getMemoOrFail.mockRejectedValue(missing);

    await expect(service.download('memo-1', actor)).rejects.toBe(missing);
    expect(collaborationDocumentService.read).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('stops at a denied READ before reading or rendering anything', async () => {
    const {
      service,
      authorizationService,
      collaborationDocumentService,
      renderer,
    } = setup();
    const denied = new ForbiddenAuthorizationPolicyException(
      'denied',
      AuthorizationPrivilege.READ,
      'memo-auth',
      'actor-1'
    );
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw denied;
    });

    await expect(service.download('memo-1', actor)).rejects.toBe(denied);
    expect(collaborationDocumentService.read).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('reports an unreadable live document as source-unavailable without rendering', async () => {
    const { service, collaborationDocumentService, renderer, logger } = setup();
    collaborationDocumentService.read.mockRejectedValue(
      Object.assign(new Error('session ended'), {
        name: 'CollaborationSessionEndError',
      })
    );

    const error = await service.download('memo-1', actor).catch(e => e);

    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('source-unavailable');
    expect(renderer.render).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      {
        message: 'Memo PDF source unavailable',
        memoId: 'memo-1',
        actorId: 'actor-1',
        error: 'CollaborationSessionEndError',
      },
      LogContext.MEMOS
    );
  });

  it.each([
    ['a ForbiddenException', new ForbiddenException('no', LogContext.MEMOS)],
    [
      'a ForbiddenAuthorizationPolicyException',
      new ForbiddenAuthorizationPolicyException(
        'no',
        AuthorizationPrivilege.READ,
        'image-auth',
        'actor-1'
      ),
    ],
    ['a FORBIDDEN_POLICY coded error', { code: 'FORBIDDEN_POLICY' }],
  ])('turns %s during the render into a not-exportable validation error', async (_label, thrown) => {
    const { service, renderer } = setup();
    renderer.render.mockRejectedValue(thrown);

    const error = await service.download('memo-1', actor).catch(e => e);

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.message).toMatch(/cannot be exported/);
  });

  it.each([
    [
      'a renderer cap',
      new ValidationException(
        'Memo PDF supports at most 20 images',
        LogContext.MEMOS
      ),
    ],
    ['a busy refusal', new MemoPdfUnavailableException('busy-actor')],
  ])('rethrows %s unchanged', async (_label, thrown) => {
    const { service, renderer } = setup();
    renderer.render.mockRejectedValue(thrown);

    await expect(service.download('memo-1', actor)).rejects.toBe(thrown);
  });
});
