import { createHash } from 'node:crypto';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AlkemioConfig } from '@src/types';
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
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {}

  async prepareMemoSigning(memoId: string, actor: ActorContext) {
    const memo = await this.getAuthorizedMemo(memoId, actor);
    if (
      !actor.authenticationID ||
      !(await this.kratosService.getCleverbaseSubject(actor.authenticationID))
    )
      throw new ValidationException(
        'Link a Cleverbase identity before signing this memo',
        LogContext.MEMOS
      );
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
      await this.fileServiceAdapter.deleteDocument(snapshot.id);
      throw error;
    }
    const { path_api_private_rest } = this.configService.get('hosting', {
      infer: true,
    });
    return {
      attemptId: attempt.id,
      previewUrl: `${path_api_private_rest}/content-signing/${attempt.id}/snapshot`,
    };
  }

  async getSnapshot(attemptId: string, actor: ActorContext): Promise<Buffer> {
    const attempt = await this.attemptService.getForActorOrFail(
      attemptId,
      actor.actorID
    );
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
}
