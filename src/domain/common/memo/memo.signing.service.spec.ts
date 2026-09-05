import { createHash } from 'node:crypto';
import { AlkemioErrorStatus } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { prosemirrorJSONToYDoc } from '@tiptap/y-tiptap';
import { markdownSchema } from './conversion/markdown.schema';
import { MemoSigningService } from './memo.signing.service';

describe('MemoSigningService', () => {
  type MemoFixture = {
    id: string;
    nameID: string;
    authorization: { id: string };
    profile?: {
      storageBucket: { id: string; authorization: { id: string } };
    };
  };
  const actor = Object.assign(new ActorContext(), {
    actorID: '11111111-1111-4111-8111-111111111111',
    authenticationID: 'kratos-1',
  });
  const memo: MemoFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    nameID: 'signed-memo',
    authorization: { id: 'memo-auth' },
    profile: {
      storageBucket: { id: 'bucket-1', authorization: { id: 'bucket-auth' } },
    },
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
    claimStart: vi.fn(),
    recordGatewayStart: vi.fn(),
    getForReturnOrFail: vi.fn(),
    finish: vi.fn(),
    findSignedForMemo: vi.fn(),
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
  const trustGatewayClient = {
    start: vi.fn(),
    getStatus: vi.fn(),
    getResult: vi.fn(),
  };
  const urlGeneratorService = {
    getMemoSigningSnapshotRestUrl: vi.fn(
      () =>
        'https://alkem.io/api/private/rest/content-signing/attempt-1/snapshot'
    ),
    getMemoUrlPath: vi.fn().mockResolvedValue('/space/demo/callout/memo'),
  };
  const logger = { error: vi.fn() };
  const storageBucketService = {
    uploadFileAsDocumentFromBuffer: vi.fn(),
  };
  const documentAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
  const documentService = {
    deleteDocument: vi.fn(),
    getPubliclyAccessibleURL: vi.fn(
      (document: { id: string }) => `https://alkem.io/document/${document.id}`
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
    trustGatewayClient as any,
    urlGeneratorService as any,
    storageBucketService as any,
    documentAuthorizationService as any,
    documentService as any,
    logger as any
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
    attemptService.claimStart.mockResolvedValue(true);
    attemptService.recordGatewayStart.mockResolvedValue(true);
    attemptService.finish.mockResolvedValue(true);
    trustGatewayClient.start.mockResolvedValue({
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    fileServiceAdapter.deleteDocument.mockResolvedValue(undefined);
    storageBucketService.uploadFileAsDocumentFromBuffer.mockResolvedValue({
      id: 'signed-document-1',
    });
    documentAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      undefined
    );
    documentService.deleteDocument.mockResolvedValue(undefined);
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
      'sign memo'
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
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Memo signing document cleanup failed',
        attemptId: 'attempt-1',
        documentId: 'snapshot-1',
      },
      undefined,
      LogContext.MEMOS
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

  it('continues the exact ready snapshot once and exposes only the authorize URL', async () => {
    const snapshot = Buffer.from('%PDF-exact-preview');
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: createHash('sha256').update(snapshot).digest('hex'),
      createdDate: new Date(),
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(snapshot);

    const result = await service.continueMemoSigning('attempt-1', actor);

    expect(result).toEqual({
      authorizeUrl: 'https://connect.acc.cleverbase.com/authorize',
    });
    expect(Object.keys(result)).toEqual(['authorizeUrl']);
    expect(trustGatewayClient.start).toHaveBeenCalledWith(
      snapshot,
      'linked-subject',
      expect.any(String)
    );
    const rawState = trustGatewayClient.start.mock.calls[0][2];
    expect(rawState).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attemptService.claimStart).toHaveBeenCalledWith(
      'attempt-1',
      createHash('sha256').update(rawState).digest('hex')
    );
    expect(attemptService.recordGatewayStart).toHaveBeenCalledWith(
      'attempt-1',
      createHash('sha256').update(rawState).digest('hex'),
      'correlation-1',
      expect.any(Date)
    );
  });

  it.each([
    [
      'unready',
      { snapshotDocumentId: undefined, contentSha256: undefined },
      /not ready/i,
    ],
    [
      'expired',
      {
        snapshotDocumentId: 'snapshot-1',
        contentSha256: 'ab'.repeat(32),
        createdDate: new Date(Date.now() - 60 * 60 * 1000 - 1),
      },
      /expired/i,
    ],
    [
      'already signed',
      {
        status: SigningAttemptStatus.SIGNED,
        snapshotDocumentId: 'snapshot-1',
        contentSha256: 'ab'.repeat(32),
      },
      /expired/i,
    ],
  ])('rejects an %s attempt before reading bytes or starting', async (_name, fields, message) => {
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      createdDate: new Date(),
      ...fields,
    });

    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow(message);
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
    expect(trustGatewayClient.start).not.toHaveBeenCalled();
  });

  it('fails closed when the initiating actor or linked identity is unavailable', async () => {
    attemptService.getForActorOrFail.mockRejectedValueOnce(
      new Error('not this actor')
    );
    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow('not this actor');
    expect(memoService.getMemoOrFail).not.toHaveBeenCalled();

    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: 'ab'.repeat(32),
      createdDate: new Date(),
    });
    kratosService.getCleverbaseSubject.mockResolvedValue(undefined);
    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow(/link a Cleverbase identity/i);
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('rejects changed snapshot bytes before claiming or starting', async () => {
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: 'ab'.repeat(32),
      createdDate: new Date(),
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      Buffer.from('%PDF-different')
    );

    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow(/changed/i);
    expect(attemptService.claimStart).not.toHaveBeenCalled();
    expect(trustGatewayClient.start).not.toHaveBeenCalled();
  });

  it('rejects revoked memo contribution before reading or claiming the prepared snapshot', async () => {
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: 'ab'.repeat(32),
      createdDate: new Date(),
    });
    authorizationService.grantAccessOrFail.mockImplementationOnce(() => {
      throw new ForbiddenAuthorizationPolicyException(
        'memo contribution revoked',
        AuthorizationPrivilege.CONTRIBUTE,
        memo.authorization.id,
        actor.actorID
      );
    });

    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
    expect(attemptService.claimStart).not.toHaveBeenCalled();
    expect(trustGatewayClient.start).not.toHaveBeenCalled();
  });

  it('lets only the winning concurrent claim start the gateway', async () => {
    const snapshot = Buffer.from('%PDF-exact-preview');
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: createHash('sha256').update(snapshot).digest('hex'),
      createdDate: new Date(),
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(snapshot);
    let claimed = false;
    attemptService.claimStart.mockImplementation(async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    });

    const results = await Promise.allSettled([
      service.continueMemoSigning('attempt-1', actor),
      service.continueMemoSigning('attempt-1', actor),
    ]);

    expect(
      results.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(
      1
    );
    expect(trustGatewayClient.start).toHaveBeenCalledOnce();
  });

  it.each([
    ['lost gateway response', 'gateway-start', 503],
    ['failed start persistence', 'gateway-start-persistence', undefined],
    ['lost conditional persistence', 'gateway-start-persistence', undefined],
  ])('%s consumes the claim and a retry never starts again', async (failure, stage, status) => {
    const snapshot = Buffer.from('%PDF-exact-preview');
    attemptService.getForActorOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      contentSha256: createHash('sha256').update(snapshot).digest('hex'),
      createdDate: new Date(),
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(snapshot);
    attemptService.claimStart
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    if (failure === 'lost gateway response')
      trustGatewayClient.start.mockRejectedValueOnce(
        Object.assign(new Error('secret transport detail'), {
          code: 'ECONNRESET',
          response: { status: 503 },
          config: { data: '%PDF-secret raw-client-state linked-subject' },
        })
      );
    else if (failure === 'failed start persistence')
      attemptService.recordGatewayStart.mockRejectedValueOnce(
        Object.assign(new Error('secret database detail'), { code: '40001' })
      );
    else attemptService.recordGatewayStart.mockResolvedValueOnce(false);

    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow(/fresh signing attempt/i);
    await expect(
      service.continueMemoSigning('attempt-1', actor)
    ).rejects.toThrow(/fresh signing attempt/i);
    expect(trustGatewayClient.start).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Memo signing start failed after the attempt was claimed',
        attemptId: 'attempt-1',
        stage,
        status,
      },
      undefined,
      LogContext.MEMOS
    );
  });

  it('attaches a fresh authorized signed copy and releases the preview after completed return', async () => {
    const state = 'raw-client-state';
    const attempt = {
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
      snapshotDocumentId: 'snapshot-1',
    };
    attemptService.getForReturnOrFail.mockResolvedValue(attempt);
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    const signedPdf = Buffer.from('%PDF-signed');
    const evidence = { signer: { serial_number: 'ABC' } };
    trustGatewayClient.getResult.mockResolvedValue({
      pdf: signedPdf,
      evidence,
    });

    await expect(
      service.completeMemoSigning('correlation-1', state, actor)
    ).resolves.toEqual({
      memoUrl: '/space/demo/callout/memo',
      attemptId: 'attempt-1',
      status: SigningAttemptStatus.SIGNED,
    });
    expect(attemptService.getForReturnOrFail).toHaveBeenCalledWith(
      'correlation-1',
      actor.actorID,
      createHash('sha256').update(state).digest('hex')
    );
    expect(
      storageBucketService.uploadFileAsDocumentFromBuffer
    ).toHaveBeenCalledWith(
      'bucket-1',
      signedPdf,
      'memo-signed.pdf',
      'application/pdf',
      undefined,
      false,
      true
    );
    expect(
      documentAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(
      { id: 'signed-document-1' },
      memo.profile?.storageBucket.authorization
    );
    expect(attemptService.finish).toHaveBeenCalledWith(
      'attempt-1',
      SigningAttemptStatus.SIGNED,
      'signed-document-1',
      evidence
    );
    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
      'snapshot-1'
    );
  });

  it.each([
    [{ status: 'declined' }, SigningAttemptStatus.CANCELLED],
    [
      { status: 'failed', reason: 'authorization_expired' },
      SigningAttemptStatus.EXPIRED,
    ],
    [
      { status: 'failed', reason: 'session_expired' },
      SigningAttemptStatus.EXPIRED,
    ],
    [
      { status: 'failed', reason: 'signature_invalid' },
      SigningAttemptStatus.FAILED,
    ],
    [{ status: 'failed' }, SigningAttemptStatus.FAILED],
    [undefined, SigningAttemptStatus.EXPIRED],
  ])('records terminal gateway outcome %# without uploading', async (gatewayStatus, status) => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue(gatewayStatus);

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status });
    expect(attemptService.finish).toHaveBeenCalledWith('attempt-1', status);
    expect(
      storageBucketService.uploadFileAsDocumentFromBuffer
    ).not.toHaveBeenCalled();
    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
      'snapshot-1'
    );
  });

  it('reports a snapshot cleanup failure without changing the terminal outcome', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'declined' });
    fileServiceAdapter.deleteDocument.mockRejectedValue(
      new Error('secret file response')
    );

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.CANCELLED });
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Memo signing document cleanup failed',
        attemptId: 'attempt-1',
        documentId: 'snapshot-1',
      },
      undefined,
      LogContext.MEMOS
    );
  });

  it('does not call file-service cleanup for an expired attempt without a snapshot', async () => {
    await service.releaseExpiredAttemptFiles({
      id: 'attempt-unprepared',
      snapshotDocumentId: null,
    } as any);

    expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'pending' },
    { status: 'authorizing' },
  ])('leaves a valid nonterminal %s return pending and retryable', async gatewayStatus => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue(gatewayStatus);

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toThrow(/retry this page/i);
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('leaves transport failure pending and retryable', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockRejectedValue(new Error('gateway down'));

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toThrow(/retry this page/i);
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('leaves a result transport failure pending and retryable', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockRejectedValue(new Error('gateway down'));

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toThrow(/retry this page/i);
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('stops a return after revoked memo CONTRIBUTE without gateway or file effects', async () => {
    const denied = new ForbiddenAuthorizationPolicyException(
      'memo access denied',
      AuthorizationPrivilege.CONTRIBUTE,
      'memo-auth',
      actor.actorID
    );
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    authorizationService.grantAccessOrFail.mockImplementationOnce(() => {
      throw denied;
    });

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toBe(denied);
    expect(trustGatewayClient.getStatus).not.toHaveBeenCalled();
    expect(trustGatewayClient.getResult).not.toHaveBeenCalled();
    expect(
      storageBucketService.uploadFileAsDocumentFromBuffer
    ).not.toHaveBeenCalled();
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('leaves a completed journey pending while its result returns 409', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue(null);

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toThrow(/retry this page/i);
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('expires a completed journey whose result has been evicted', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      snapshotDocumentId: 'snapshot-1',
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue(undefined);

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.EXPIRED });
    expect(attemptService.finish).toHaveBeenCalledWith(
      'attempt-1',
      SigningAttemptStatus.EXPIRED
    );
  });

  it('leaves malformed completed evidence pending and logs only a safe status', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockRejectedValue(
      new ValidationException('Invalid gateway response', undefined as any)
    );

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toThrow(/retry this page/i);
    expect(attemptService.finish).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Memo signing result response was malformed',
        attemptId: 'attempt-1',
        status: AlkemioErrorStatus.BAD_USER_INPUT,
      },
      undefined,
      LogContext.MEMOS
    );
    expect(
      storageBucketService.uploadFileAsDocumentFromBuffer
    ).not.toHaveBeenCalled();
  });

  it('returns a terminal replay without a second gateway or file operation', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      memoId: memo.id,
      status: SigningAttemptStatus.SIGNED,
    });

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.SIGNED });
    expect(trustGatewayClient.getStatus).not.toHaveBeenCalled();
    expect(
      storageBucketService.uploadFileAsDocumentFromBuffer
    ).not.toHaveBeenCalled();
  });

  it('expires a claimed attempt whose gateway start was never recorded', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: null,
      snapshotDocumentId: 'snapshot-1',
    });

    await expect(
      service.completeMemoSigning('unrecorded-correlation', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.EXPIRED });
    expect(trustGatewayClient.getStatus).not.toHaveBeenCalled();
    expect(attemptService.finish).toHaveBeenCalledWith(
      'attempt-1',
      SigningAttemptStatus.EXPIRED
    );
  });

  it('deletes only its losing signed upload and returns the concurrent winner', async () => {
    const pending = {
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    };
    attemptService.getForReturnOrFail.mockResolvedValue(pending);
    attemptService.finish.mockResolvedValue(false);
    attemptService.getForActorOrFail.mockResolvedValue({
      ...pending,
      status: SigningAttemptStatus.SIGNED,
      signedDocumentId: 'winner-document',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue({
      pdf: Buffer.from('%PDF-signed'),
      evidence: {},
    });

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.SIGNED });
    expect(documentService.deleteDocument).toHaveBeenCalledWith({
      ID: 'signed-document-1',
    });
  });

  it('deletes its owned signed upload when authorization fails', async () => {
    const authorizationFailure = new Error('policy write failed');
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue({
      pdf: Buffer.from('%PDF-signed'),
      evidence: {},
    });
    documentAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      authorizationFailure
    );

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toBe(authorizationFailure);
    expect(documentService.deleteDocument).toHaveBeenCalledWith({
      ID: 'signed-document-1',
    });
    expect(attemptService.finish).not.toHaveBeenCalled();
  });

  it('returns expired for a vanished row and reports losing-upload cleanup failure safely', async () => {
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    attemptService.finish.mockResolvedValue(false);
    attemptService.getForActorOrFail.mockRejectedValue(
      new ValidationException('attempt deleted', undefined as any)
    );
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue({
      pdf: Buffer.from('%PDF-signed'),
      evidence: {},
    });
    documentService.deleteDocument.mockRejectedValue(
      new Error('cleanup failed')
    );

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).resolves.toMatchObject({ status: SigningAttemptStatus.EXPIRED });
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Memo signing document cleanup failed',
        attemptId: 'attempt-1',
        documentId: 'signed-document-1',
      },
      undefined,
      LogContext.MEMOS
    );
  });

  it('propagates an unexpected winner read failure after deleting its losing upload', async () => {
    const readFailure = new Error('database unavailable');
    attemptService.getForReturnOrFail.mockResolvedValue({
      id: 'attempt-1',
      actorId: actor.actorID,
      memoId: memo.id,
      status: SigningAttemptStatus.PENDING,
      correlationId: 'correlation-1',
    });
    attemptService.finish.mockResolvedValue(false);
    attemptService.getForActorOrFail.mockRejectedValue(readFailure);
    trustGatewayClient.getStatus.mockResolvedValue({ status: 'completed' });
    trustGatewayClient.getResult.mockResolvedValue({
      pdf: Buffer.from('%PDF-signed'),
      evidence: {},
    });

    await expect(
      service.completeMemoSigning('correlation-1', 'state', actor)
    ).rejects.toBe(readFailure);
    expect(documentService.deleteDocument).toHaveBeenCalledWith({
      ID: 'signed-document-1',
    });
  });
});
