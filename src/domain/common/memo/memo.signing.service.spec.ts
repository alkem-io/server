import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { MemoSigningService } from './memo.signing.service';

describe('MemoSigningService', () => {
  const actor = Object.assign(new ActorContext(), {
    actorID: '11111111-1111-4111-8111-111111111111',
    authenticationID: 'kratos-1',
  });
  const memo = {
    id: '22222222-2222-4222-8222-222222222222',
    authorization: { id: 'memo-auth' },
    profile: { storageBucket: { id: 'bucket-1' } },
  };
  const pdf = Buffer.from('%PDF-fixed-preview');
  const calls: string[] = [];
  const authorizationService = {
    grantAccessOrFail: vi.fn(() => calls.push('authorize')),
  };
  const memoService = {
    getMemoOrFail: vi.fn(async () => memo),
  };
  const attemptService = {
    createUnready: vi.fn(async () => {
      calls.push('insert');
      return { id: 'attempt-1' };
    }),
    finalizePrepared: vi.fn(async () => {
      calls.push('finalize');
      return true;
    }),
    getForActorOrFail: vi.fn(),
  };
  const kratosService = {
    getCleverbaseSubject: vi.fn(async () => {
      calls.push('identity');
      return 'linked-subject';
    }),
  };
  const collaborationDocumentService = {
    read: vi.fn(async () => {
      calls.push('live-read');
      return '# Current content';
    }),
  };
  const renderer = {
    render: vi.fn(async () => {
      calls.push('render');
      return pdf;
    }),
  };
  const fileServiceAdapter = {
    createInternalDocumentInBucket: vi.fn(async () => {
      calls.push('upload');
      return { id: 'snapshot-1' };
    }),
    deleteDocument: vi.fn(),
    getDocumentContent: vi.fn(),
  };
  const configService = {
    get: vi.fn(() => ({ path_api_private_rest: '/api/private/rest' })),
  };
  const service = new MemoSigningService(
    authorizationService as any,
    memoService as any,
    attemptService as any,
    kratosService as any,
    collaborationDocumentService as any,
    renderer as any,
    fileServiceAdapter as any,
    configService as any
  );

  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
    memoService.getMemoOrFail.mockResolvedValue(memo);
    kratosService.getCleverbaseSubject.mockImplementation(async () => {
      calls.push('identity');
      return 'linked-subject';
    });
    attemptService.createUnready.mockImplementation(async () => {
      calls.push('insert');
      return { id: 'attempt-1' };
    });
    collaborationDocumentService.read.mockImplementation(async () => {
      calls.push('live-read');
      return '# Current content';
    });
    renderer.render.mockImplementation(async () => {
      calls.push('render');
      return pdf;
    });
    fileServiceAdapter.createInternalDocumentInBucket.mockImplementation(
      async () => {
        calls.push('upload');
        return { id: 'snapshot-1' };
      }
    );
    attemptService.finalizePrepared.mockImplementation(async () => {
      calls.push('finalize');
      return true;
    });
  });

  it('checks access and linked identity before row-first live rendering', async () => {
    const result = await service.prepareMemoSigning(memo.id, actor);

    expect(calls).toEqual([
      'authorize',
      'identity',
      'insert',
      'live-read',
      'render',
      'upload',
      'finalize',
    ]);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      memo.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      expect.any(String)
    );
    expect(collaborationDocumentService.read).toHaveBeenCalledWith(
      memo.id,
      'memo',
      actor.actorID,
      expect.any(Function)
    );
    expect(renderer.render).toHaveBeenCalledWith(
      '# Current content',
      'bucket-1',
      actor
    );
    expect(
      fileServiceAdapter.createInternalDocumentInBucket
    ).toHaveBeenCalledWith(
      pdf,
      'bucket-1',
      'memo-signing-preview.pdf',
      'application/pdf'
    );
    expect(attemptService.finalizePrepared).toHaveBeenCalledWith(
      'attempt-1',
      'snapshot-1',
      expect.stringMatching(/^[0-9a-f]{64}$/)
    );
    expect(result).toEqual({
      attemptId: 'attempt-1',
      previewUrl: '/api/private/rest/content-signing/attempt-1/snapshot',
    });
  });

  it('fails an unlinked identity before inserting or rendering', async () => {
    kratosService.getCleverbaseSubject.mockResolvedValue(undefined);

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      ValidationException
    );
    expect(attemptService.createUnready).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('fails a session without a Kratos identity before rendering', async () => {
    const unlinkedActor = Object.assign(new ActorContext(), {
      actorID: actor.actorID,
    });

    await expect(
      service.prepareMemoSigning(memo.id, unlinkedActor)
    ).rejects.toThrow(ValidationException);
    expect(kratosService.getCleverbaseSubject).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('deletes only its uploaded PDF when memo deletion wins finalization', async () => {
    attemptService.finalizePrepared.mockResolvedValue(false);

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      ValidationException
    );
    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
      'snapshot-1'
    );
  });

  it('leaves an unready row for the bounded sweep when rendering fails', async () => {
    renderer.render.mockRejectedValue(new Error('renderer failed'));

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      'renderer failed'
    );
    expect(attemptService.createUnready).toHaveBeenCalled();
    expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    expect(attemptService.finalizePrepared).not.toHaveBeenCalled();
  });

  it('streams only the initiating actor snapshot after current memo access', async () => {
    attemptService.getForActorOrFail.mockResolvedValue({
      memoId: memo.id,
      snapshotDocumentId: 'snapshot-1',
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(pdf);

    await expect(service.getSnapshot('attempt-1', actor)).resolves.toBe(pdf);
    expect(attemptService.getForActorOrFail).toHaveBeenCalledWith(
      'attempt-1',
      actor.actorID
    );
    expect(authorizationService.grantAccessOrFail).toHaveBeenLastCalledWith(
      actor,
      memo.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      expect.any(String)
    );
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledWith(
      'snapshot-1'
    );
  });
});
