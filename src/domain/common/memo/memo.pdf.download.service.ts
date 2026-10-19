import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import {
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Y from 'yjs';
import { memoPdfFilename } from './memo.pdf.filename';
import { ActorRateWindow } from './memo.pdf.rate.window';
import { MemoPdfRenderer } from './memo.pdf.renderer';
import { MemoService } from './memo.service';

/**
 * Downloads one actor may start per minute on one server instance. A reader
 * downloads a memo now and then; this keeps one account from holding a render
 * slot continuously by looping requests.
 */
export const MEMO_PDF_DOWNLOADS_PER_ACTOR_PER_MINUTE = 10;

/**
 * Produces a memo's current content as a PDF for a reader. Nothing is stored:
 * the PDF is rendered from the live collaborative document on every request
 * and returned to the caller. The memo's existence and the actor's READ are
 * established before any content is read or any render worker is used.
 */
@Injectable()
export class MemoPdfDownloadService {
  private readonly rateWindow = new ActorRateWindow(
    MEMO_PDF_DOWNLOADS_PER_ACTOR_PER_MINUTE,
    60_000
  );

  constructor(
    private readonly memoService: MemoService,
    private readonly authorizationService: AuthorizationService,
    private readonly collaborationDocumentService: CollaborationDocumentService,
    private readonly renderer: MemoPdfRenderer,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async download(
    memoId: string,
    actor: ActorContext,
    signal?: AbortSignal
  ): Promise<{ pdf: Buffer; filename: string }> {
    // Checked first, so a refused request costs no lookup and no live read.
    const rate = this.rateWindow.take(actor.actorID);
    if (!rate.admitted) {
      this.logger.warn?.(
        {
          message: 'Memo PDF download rate limited',
          memoId,
          actorId: actor.actorID,
        },
        LogContext.MEMOS
      );
      throw new MemoPdfUnavailableException('rate-limited', {
        retryAfterSeconds: Math.max(1, Math.ceil(rate.retryAfterMs / 1000)),
      });
    }

    const memo = await this.memoService.getMemoOrFail(memoId, {
      relations: { authorization: true, profile: { storageBucket: true } },
    });
    this.authorizationService.grantAccessOrFail(
      actor,
      memo.authorization,
      AuthorizationPrivilege.READ,
      `download memo pdf: ${memoId}`
    );

    let state: Buffer;
    try {
      state = await this.collaborationDocumentService.read(
        memoId,
        'memo',
        actor.actorID,
        doc => Buffer.from(Y.encodeStateAsUpdateV2(doc))
      );
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Memo PDF source unavailable',
          memoId,
          actorId: actor.actorID,
          error: (error as Error)?.name,
        },
        LogContext.MEMOS
      );
      throw new MemoPdfUnavailableException('source-unavailable');
    }

    let pdf: Buffer;
    try {
      pdf = await this.renderer.render(
        state,
        memo.profile?.storageBucket?.id,
        actor,
        { signal, memoId, purpose: 'download' }
      );
    } catch (error) {
      // The reader may read the memo; an image inside it that they may not
      // read, or that lives outside the memo, makes the content unexportable
      // rather than the memo forbidden.
      if (
        error instanceof ForbiddenException ||
        error instanceof ForbiddenAuthorizationPolicyException ||
        (error as { code?: string })?.code ===
          AlkemioErrorStatus.FORBIDDEN_POLICY
      )
        throw new ValidationException(
          'Memo PDF contains content that cannot be exported',
          LogContext.MEMOS
        );
      throw error;
    }

    return {
      pdf,
      filename: memoPdfFilename(memo.profile?.displayName, new Date()),
    };
  }
}
