import { createHash, randomBytes } from 'node:crypto';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SigningAttempt } from '@domain/common/content-signing/signing.attempt.entity';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
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
    private readonly storageBucketService: StorageBucketService,
    private readonly documentAuthorizationService: DocumentAuthorizationService,
    private readonly documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async prepareMemoSigning(memoId: string, actor: ActorContext) {
    const memo = await this.getAuthorizedMemo(memoId, actor);
    await this.requireCleverbaseSubject(actor);
    const storageBucketId = this.requireBucket(memo).id;

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
        .catch(() => this.logCleanupFailure(attempt.id, snapshot.id));
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

  async completeMemoSigning(
    correlationId: string,
    clientState: string,
    actor: ActorContext
  ) {
    const attempt = await this.attemptService.getForReturnOrFail(
      correlationId,
      actor.actorID,
      createHash('sha256').update(clientState).digest('hex')
    );
    const memo = await this.getAuthorizedMemo(attempt.memoId, actor);
    const memoUrl = await this.urlGeneratorService.getMemoUrlPath(
      memo.id,
      memo.nameID
    );
    const outcome = (status: SigningAttemptStatus) => ({
      memoUrl,
      attemptId: attempt.id,
      status,
    });
    const finish = async (
      status: Exclude<SigningAttemptStatus, SigningAttemptStatus.PENDING>,
      signedDocumentId?: string,
      evidence?: Record<string, unknown>
    ) =>
      outcome(await this.finish(attempt, status, signedDocumentId, evidence));
    if (attempt.status !== SigningAttemptStatus.PENDING)
      return outcome(attempt.status);

    let gatewayStatus;
    try {
      gatewayStatus = attempt.correlationId
        ? await this.trustGatewayClient.getStatus(correlationId)
        : undefined;
    } catch {
      throw this.returnPending();
    }
    const terminal = this.terminalFor(gatewayStatus);
    if (terminal) return finish(terminal);

    let result;
    try {
      result = await this.trustGatewayClient.getResult(correlationId);
    } catch (error) {
      if (error instanceof ValidationException) {
        this.logger.error?.(
          {
            message: 'Memo signing result response was malformed',
            attemptId: attempt.id,
            status: error.code,
          },
          undefined,
          LogContext.MEMOS
        );
      }
      throw this.returnPending();
    }
    if (result === null) throw this.returnPending();
    if (!result) return finish(SigningAttemptStatus.EXPIRED);
    const bucket = this.requireBucket(memo);
    const signed =
      await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        bucket.id,
        result.pdf,
        'memo-signed.pdf',
        'application/pdf',
        // DocumentAuthorizationService adds USER_SELF_MANAGEMENT for createdBy;
        // attribution stays on attempt.actorId without granting document privileges.
        undefined,
        false,
        true
      );
    try {
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        signed,
        bucket.authorization
      );
      return await finish(
        SigningAttemptStatus.SIGNED,
        signed.id,
        result.evidence
      );
    } catch (error) {
      await this.deleteSignedDocument(attempt.id, signed.id);
      throw error;
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
      'sign memo'
    );
    return memo;
  }

  private freshAttemptRequired(): ValidationException {
    return new ValidationException(
      'Signing was already started; prepare a fresh signing attempt',
      LogContext.MEMOS
    );
  }

  private async finish(
    attempt: SigningAttempt,
    status: Exclude<SigningAttemptStatus, SigningAttemptStatus.PENDING>,
    signedDocumentId?: string,
    evidence?: Record<string, unknown>
  ): Promise<SigningAttemptStatus> {
    const saved = signedDocumentId
      ? await this.attemptService.finish(
          attempt.id,
          status,
          signedDocumentId,
          evidence
        )
      : await this.attemptService.finish(attempt.id, status);
    if (saved) {
      await this.deleteSnapshot(attempt.id, attempt.snapshotDocumentId);
      return status;
    }
    if (signedDocumentId)
      await this.deleteSignedDocument(attempt.id, signedDocumentId);
    try {
      return (
        await this.attemptService.getForActorOrFail(attempt.id, attempt.actorId)
      ).status;
    } catch (error) {
      if (error instanceof ValidationException)
        return SigningAttemptStatus.EXPIRED;
      throw error;
    }
  }

  private async deleteSnapshot(
    attemptId: string,
    documentId?: string | null
  ): Promise<void> {
    if (documentId)
      await this.fileServiceAdapter
        .deleteDocument(documentId)
        .catch(() => this.logCleanupFailure(attemptId, documentId));
  }

  private async deleteSignedDocument(
    attemptId: string,
    documentId: string
  ): Promise<void> {
    await this.documentService
      .deleteDocument({ ID: documentId })
      .catch(() => this.logCleanupFailure(attemptId, documentId));
  }

  async releaseExpiredAttemptFiles(attempt: SigningAttempt): Promise<void> {
    await this.deleteSnapshot(attempt.id, attempt.snapshotDocumentId);
  }

  private logCleanupFailure(attemptId: string, documentId: string): void {
    this.logger.error?.(
      {
        message: 'Memo signing document cleanup failed',
        attemptId,
        documentId,
      },
      undefined,
      LogContext.MEMOS
    );
  }

  private requireBucket(memo: IMemo) {
    const bucket = memo.profile?.storageBucket;
    if (bucket) return bucket;
    throw new ValidationException(
      'Memo storage is unavailable',
      LogContext.MEMOS
    );
  }

  private terminalFor(gateway?: {
    status: string;
    reason?: string;
  }): Exclude<SigningAttemptStatus, SigningAttemptStatus.PENDING> | undefined {
    if (!gateway) return SigningAttemptStatus.EXPIRED;
    if (gateway.status === 'completed') return undefined;
    if (gateway.status === 'declined') return SigningAttemptStatus.CANCELLED;
    if (gateway.status === 'failed')
      return ['authorization_expired', 'session_expired'].includes(
        gateway.reason ?? ''
      )
        ? SigningAttemptStatus.EXPIRED
        : SigningAttemptStatus.FAILED;
    throw this.returnPending();
  }

  private returnPending(): ValidationException {
    return new ValidationException(
      'Signing is still in progress; retry this page',
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
