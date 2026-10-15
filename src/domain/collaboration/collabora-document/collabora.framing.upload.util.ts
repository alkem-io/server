import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { streamToBuffer } from '@common/utils/file.util';
import { FileUpload } from 'graphql-upload';
import type { CreateCalloutFramingInput } from '../callout-framing/dto/callout.framing.dto.create';

/**
 * Buffer a multipart `file` argument onto the framing's
 * `CreateCollaboraDocumentInput.uploadedFile` transient field, which
 * `CollaboraDocumentService.createCollaboraDocument` dispatches on — its upload
 * mode runs file-service-go's MIME sniff, type derivation and the
 * temp→permanent atomic flow.
 *
 * Rejects before buffering if the file isn't being routed to a
 * COLLABORA_DOCUMENT framing: the file would otherwise be silently discarded
 * and the caller would think the upload took effect.
 */
export async function bufferFramingUploadOrFail(
  framing: CreateCalloutFramingInput | undefined,
  fileUpload: FileUpload,
  streamTimeoutMs: number
): Promise<void> {
  if (
    framing?.type !== CalloutFramingType.COLLABORA_DOCUMENT ||
    !framing.collaboraDocument
  ) {
    throw new ValidationException(
      'file argument is only valid with framing.type = COLLABORA_DOCUMENT and framing.collaboraDocument supplied',
      LogContext.COLLABORATION
    );
  }
  framing.collaboraDocument.uploadedFile = {
    buffer: await streamToBuffer(
      fileUpload.createReadStream(),
      streamTimeoutMs
    ),
    filename: fileUpload.filename,
    mimetype: fileUpload.mimetype,
  };
}
