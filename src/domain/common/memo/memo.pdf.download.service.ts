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
import { Injectable } from '@nestjs/common';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import * as Y from 'yjs';
import { memoPdfFilename } from './memo.pdf.filename';
import { MemoPdfRenderer } from './memo.pdf.renderer';
import { MemoService } from './memo.service';

/**
 * Produces a memo's current content as a PDF for a reader. Nothing is stored:
 * the PDF is rendered from the live collaborative document on every request
 * and returned to the caller. The memo's existence and the actor's READ are
 * established before any content is read or any render worker is used.
 */
@Injectable()
export class MemoPdfDownloadService {
  constructor(
    private readonly memoService: MemoService,
    private readonly authorizationService: AuthorizationService,
    private readonly collaborationDocumentService: CollaborationDocumentService,
    private readonly renderer: MemoPdfRenderer
  ) {}

  async download(
    memoId: string,
    actor: ActorContext,
    signal?: AbortSignal
  ): Promise<{ pdf: Buffer; filename: string }> {
    const memo = await this.memoService.getMemoOrFail(memoId, {
      relations: { authorization: true, profile: { storageBucket: true } },
    });
    this.authorizationService.grantAccessOrFail(
      actor,
      memo.authorization,
      AuthorizationPrivilege.READ,
      `download memo pdf: ${memoId}`
    );

    // Read only once the executor admits the render: joining the live room
    // takes one of its connections, which a refused request must not hold.
    const readState = async () => {
      try {
        return await this.collaborationDocumentService.read(
          memoId,
          'memo',
          actor.actorID,
          doc => Buffer.from(Y.encodeStateAsUpdateV2(doc))
        );
      } catch (error) {
        // The executor logs the job, naming this cause.
        throw Object.assign(
          new MemoPdfUnavailableException('source-unavailable'),
          { cause: error }
        );
      }
    };

    let pdf: Buffer;
    try {
      pdf = await this.renderer.render(
        readState,
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
