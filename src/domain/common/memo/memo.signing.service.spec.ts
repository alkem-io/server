import { createHash } from 'node:crypto';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorJSONToYDoc } from '@tiptap/y-tiptap';
import { markdownSchema } from './conversion/markdown.schema';
import { MemoSigningService } from './memo.signing.service';

describe('MemoSigningService', () => {
  type MemoFixture = {
    id: string;
    authorization: { id: string };
    profile?: { storageBucket: { id: string } };
  };
  const actor = Object.assign(new ActorContext(), {
    actorID: '11111111-1111-4111-8111-111111111111',
    authenticationID: 'kratos-1',
  });
  const memo: MemoFixture = {
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
    getMemoOrFail: vi.fn<() => Promise<MemoFixture>>(async () => memo),
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
    getCleverbaseSubject: vi.fn<() => Promise<string | undefined>>(async () => {
      calls.push('identity');
      return 'linked-subject';
    }),
  };
  const collaborationDocumentService = {
    read: vi.fn<
      (
        id: string,
        type: string,
        actorId: string,
        project: (document: ReturnType<typeof prosemirrorJSONToYDoc>) => string
      ) => Promise<string>
    >(async () => {
      calls.push('live-read');
      return '# Current content';
    }),
  };
  const renderer = {
    render: vi.fn<
      (
        markdown: string,
        storageBucketId: string,
        actor: ActorContext
      ) => Promise<Buffer>
    >(async () => {
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
  const urlGeneratorService = {
    getMemoSigningSnapshotRestUrl: vi.fn(
      () =>
        'https://alkem.io/api/private/rest/content-signing/attempt-1/snapshot'
    ),
  };
  const service = new MemoSigningService(
    authorizationService as any,
    memoService as any,
    attemptService as any,
    kratosService as any,
    collaborationDocumentService as any,
    renderer as any,
    fileServiceAdapter as any,
    urlGeneratorService as any
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
    fileServiceAdapter.deleteDocument.mockResolvedValue(undefined);
    urlGeneratorService.getMemoSigningSnapshotRestUrl.mockReturnValue(
      'https://alkem.io/api/private/rest/content-signing/attempt-1/snapshot'
    );
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
      'application/pdf',
      { skipDedup: true }
    );
    expect(attemptService.finalizePrepared).toHaveBeenCalledWith(
      'attempt-1',
      'snapshot-1',
      createHash('sha256').update(pdf).digest('hex')
    );
    expect(result).toEqual({
      attemptId: 'attempt-1',
      previewUrl:
        'https://alkem.io/api/private/rest/content-signing/attempt-1/snapshot',
    });
  });

  it('renders the current projection with its known table span and non-paragraph losses', async () => {
    const liveDocument = prosemirrorJSONToYDoc(
      markdownSchema,
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'highlight' }],
                text: 'Projected highlight text',
              },
            ],
          },
          {
            type: 'orderedList',
            attrs: { start: 4 },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Projected list item' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    attrs: { colspan: 2, rowspan: 1, colwidth: [120, 120] },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Projected header' }],
                      },
                      {
                        type: 'blockquote',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              { type: 'text', text: 'Omitted rich block' },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'default'
    );
    collaborationDocumentService.read.mockImplementation(
      async (_id, _type, _actor, project) => project(liveDocument)
    );

    try {
      await service.prepareMemoSigning(memo.id, actor);
    } finally {
      liveDocument.destroy();
    }

    const projection = renderer.render.mock.calls[0][0];
    expect(projection).toContain('==Projected highlight text==');
    expect(projection).toContain('1. Projected list item');
    expect(projection).not.toContain('4. Projected list item');
    expect(projection).toContain('| Projected header |');
    expect(projection).not.toContain('Omitted rich block');
    expect(projection).not.toContain('colspan');
    expect(projection).not.toContain('120');
  });

  it('fails an unlinked identity before inserting or rendering', async () => {
    kratosService.getCleverbaseSubject.mockResolvedValue(undefined);

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      ValidationException
    );
    expect(attemptService.createUnready).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('fails memo authorization before checking identity or rendering', async () => {
    authorizationService.grantAccessOrFail.mockImplementationOnce(() => {
      throw new Error('denied');
    });

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      'denied'
    );
    expect(kratosService.getCleverbaseSubject).not.toHaveBeenCalled();
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

  it('fails a memo without a storage bucket before inserting or rendering', async () => {
    memoService.getMemoOrFail.mockResolvedValue({
      ...memo,
      profile: undefined,
    });

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      /storage/i
    );
    expect(attemptService.createUnready).not.toHaveBeenCalled();
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

  it('does not let compensation failure mask a lost preparation', async () => {
    attemptService.finalizePrepared.mockResolvedValue(false);
    fileServiceAdapter.deleteDocument.mockRejectedValue(
      new Error('cleanup failed')
    );

    await expect(service.prepareMemoSigning(memo.id, actor)).rejects.toThrow(
      /memo was deleted/i
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

  it('rejects an unrelated actor before reading the memo or snapshot', async () => {
    attemptService.getForActorOrFail.mockRejectedValue(
      new ValidationException('not this actor', undefined as any)
    );

    await expect(service.getSnapshot('attempt-1', actor)).rejects.toThrow(
      ForbiddenException
    );
    expect(memoService.getMemoOrFail).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('preserves an attempt lookup failure', async () => {
    attemptService.getForActorOrFail.mockRejectedValue(
      new Error('attempt storage unavailable')
    );

    await expect(service.getSnapshot('attempt-1', actor)).rejects.toThrow(
      'attempt storage unavailable'
    );
    expect(memoService.getMemoOrFail).not.toHaveBeenCalled();
  });

  it('rejects an unready preview after checking current memo access', async () => {
    attemptService.getForActorOrFail.mockResolvedValue({
      memoId: memo.id,
      snapshotDocumentId: undefined,
    });

    await expect(service.getSnapshot('attempt-1', actor)).rejects.toThrow(
      /not ready/i
    );
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });
});
