import { createHash, randomBytes } from 'node:crypto';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { TrustGatewayClient } from '@services/adapters/trust-gateway/trust.gateway.client';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Y from 'yjs';
import { yjsStateToMarkdown } from './conversion';
import { IMemo } from './memo.interface';
import { MemoPdfRenderer } from './memo.pdf.renderer';
import { MemoService } from './memo.service';

@Injectable()
export class MemoSigningService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly memoService: MemoService,
    private readonly attemptService: SigningAttemptService,
    private readonly kratosService: KratosService,
    private readonly collaborationDocumentService: CollaborationDocumentService,
    private readonly renderer: MemoPdfRenderer,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly trustGatewayClient: TrustGatewayClient,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async prepareMemoSigning(memoId: string, actor: ActorContext) {
    const memo = await this.getAuthorizedMemo(memoId, actor);
    await this.requireCleverbaseSubject(actor);
    const storageBucketId = memo.profile?.storageBucket?.id;
    if (!storageBucketId)
      throw new ValidationException(
        'Memo storage is unavailable',
        LogContext.MEMOS
      );

    const attempt = await this.attemptService.createUnready(
      memoId,
      actor.actorID
    );
    const markdown = await this.collaborationDocumentService.read(
      memoId,
      'memo',
      actor.actorID,
      doc => yjsStateToMarkdown(Buffer.from(Y.encodeStateAsUpdateV2(doc)))
    );
    const pdf = await this.renderer.render(markdown, storageBucketId, actor);
    const snapshot =
      await this.fileServiceAdapter.createInternalDocumentInBucket(
        pdf,
        storageBucketId,
        'memo-signing-preview.pdf',
        'application/pdf',
        { skipDedup: true }
      );
    try {
      if (
        !(await this.attemptService.finalizePrepared(
          attempt.id,
          snapshot.id,
          createHash('sha256').update(pdf).digest('hex')
        ))
      )
        throw new ValidationException(
          'The memo was deleted while preparing the signing copy',
          LogContext.MEMOS
        );
    } catch (error) {
      await this.fileServiceAdapter
        .deleteDocument(snapshot.id)
        .catch(() => undefined);
      throw error;
    }
    return {
      attemptId: attempt.id,
      previewUrl: this.urlGeneratorService.getMemoSigningSnapshotRestUrl(
        attempt.id
      ),
    };
  }

  async getSnapshot(attemptId: string, actor: ActorContext): Promise<Buffer> {
    const attempt = await this.attemptService
      .getForActorOrFail(attemptId, actor.actorID)
      .catch(error => {
        if (error instanceof ValidationException)
          throw new ForbiddenException(
            'Signing preview belongs to another actor',
            LogContext.MEMOS
          );
        throw error;
      });
    await this.getAuthorizedMemo(attempt.memoId, actor);
    if (!attempt.snapshotDocumentId)
      throw new ValidationException(
        'Signing preview is not ready',
        LogContext.MEMOS
      );
    return this.fileServiceAdapter.getDocumentContent(
      attempt.snapshotDocumentId
    );
  }

  async continueMemoSigning(
    attemptId: string,
    actor: ActorContext
  ): Promise<{ authorizeUrl: string }> {
    const attempt = await this.attemptService.getForActorOrFail(
      attemptId,
      actor.actorID
    );
    if (!attempt.snapshotDocumentId || !attempt.contentSha256)
      throw new ValidationException(
        'Signing preview is not ready',
        LogContext.MEMOS
      );
    if (
      attempt.status !== SigningAttemptStatus.PENDING ||
      attempt.createdDate.getTime() <=
        Date.now() - SigningAttemptService.PREPARATION_WINDOW_MS
    )
      throw new ValidationException(
        'Signing preview has expired',
        LogContext.MEMOS
      );
    await this.getAuthorizedMemo(attempt.memoId, actor);
    const subject = await this.requireCleverbaseSubject(actor);
    const snapshot = await this.fileServiceAdapter.getDocumentContent(
      attempt.snapshotDocumentId
    );
    if (
      createHash('sha256').update(snapshot).digest('hex') !==
      attempt.contentSha256
    )
      throw new ValidationException(
        'The signing preview bytes have changed',
        LogContext.MEMOS
      );
    const clientState = randomBytes(32).toString('base64url');
    const clientStateHash = createHash('sha256')
      .update(clientState)
      .digest('hex');
    if (!(await this.attemptService.claimStart(attemptId, clientStateHash)))
      throw this.freshAttemptRequired();
    let stage: 'gateway-start' | 'gateway-start-persistence' = 'gateway-start';
    try {
      const start = await this.trustGatewayClient.start(
        snapshot,
        subject,
        clientState
      );
      stage = 'gateway-start-persistence';
      if (
        !(await this.attemptService.recordGatewayStart(
          attemptId,
          clientStateHash,
          start.correlationId,
          start.expiresAt
        ))
      )
        throw this.freshAttemptRequired();
      return { authorizeUrl: start.redirectUrl };
    } catch (error) {
      const status = (error as { response?: { status?: unknown } })?.response
        ?.status;
      this.logger.error?.(
        {
          message: 'Memo signing start failed after the attempt was claimed',
          attemptId,
          stage,
          status: typeof status === 'number' ? status : undefined,
        },
        undefined,
        LogContext.MEMOS
      );
      throw this.freshAttemptRequired();
    }
  }

  private async getAuthorizedMemo(
    memoId: string,
    actor: ActorContext
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(memoId, {
      relations: { authorization: true, profile: { storageBucket: true } },
    });
    this.authorizationService.grantAccessOrFail(
      actor,
      memo.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `sign memo: ${memoId}`
    );
    return memo;
  }

  private freshAttemptRequired(): ValidationException {
    return new ValidationException(
      'Signing was already started; prepare a fresh signing attempt',
      LogContext.MEMOS
    );
  }

  private async requireCleverbaseSubject(actor: ActorContext): Promise<string> {
    const subject = await (actor.authenticationID
      ? this.kratosService.getCleverbaseSubject(actor.authenticationID)
      : undefined);
    if (subject) return subject;
    throw new ValidationException(
      'Link a Cleverbase identity before signing this memo',
      LogContext.MEMOS
    );
  }
}
