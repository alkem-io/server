import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import sharp from 'sharp';
import {
  MAX_SOURCE_IMAGE_PIXELS,
  MemoPdfImageOutcome,
  ResolveMemoImage,
} from './memo.pdf.render.core';

const MAX_RENDERED_IMAGE_EDGE = 1200;
const MAX_NORMALIZED_IMAGE_BYTES = 16 * 1024 * 1024;

const invalid = (message: string): never => {
  throw new ValidationException(message, LogContext.MEMOS);
};

/**
 * Resolves the images of one memo render in the main process, where storage,
 * authorization and the file service live. Only the normalised JPEG bytes cross
 * into the render worker.
 */
@Injectable()
export class MemoPdfImageResolver {
  constructor(
    private readonly documentService: DocumentService,
    private readonly authorizationService: AuthorizationService,
    private readonly fileServiceAdapter: FileServiceAdapter
  ) {}

  /**
   * One resolver per render: it scopes images to the memo's storage bucket,
   * checks the actor's READ on each, and carries the cumulative normalised
   * size budget across the images of that render.
   */
  bind(bucketId: string | undefined, actor: ActorContext): ResolveMemoImage {
    let normalizedImageBytes = 0;
    return async (source: string): Promise<MemoPdfImageOutcome> => {
      if (!this.documentService.isAlkemioDocumentURL(source))
        return { kind: 'link' };
      const stored = await this.documentService.getDocumentFromURL(source, {
        relations: { authorization: true, storageBucket: true },
      });
      if (!stored?.storageBucket || stored.storageBucket.id !== bucketId)
        invalid('Memo PDF image does not belong to the memo bucket');
      this.authorizationService.grantAccessOrFail(
        actor,
        stored!.authorization,
        AuthorizationPrivilege.READ,
        'read memo PDF image'
      );
      const bytes = await this.fileServiceAdapter.getDocumentContent(
        stored!.id
      );
      try {
        const jpeg = await sharp(bytes, {
          limitInputPixels: MAX_SOURCE_IMAGE_PIXELS,
        })
          .rotate()
          .resize(MAX_RENDERED_IMAGE_EDGE, MAX_RENDERED_IMAGE_EDGE, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .flatten({ background: '#ffffff' })
          .toColourspace('srgb')
          .jpeg({ quality: 80 })
          .toBuffer({ resolveWithObject: true });
        normalizedImageBytes += jpeg.data.length;
        if (normalizedImageBytes > MAX_NORMALIZED_IMAGE_BYTES)
          invalid('Memo PDF images exceed the 16 MiB normalized size limit');
        return {
          kind: 'data',
          jpeg: jpeg.data,
          width: jpeg.info.width,
          height: jpeg.info.height,
        };
      } catch (error) {
        if (error instanceof ValidationException) throw error;
        if (error instanceof Error && /pixel limit/i.test(error.message))
          invalid(
            `Memo PDF image supports at most ${MAX_SOURCE_IMAGE_PIXELS.toLocaleString('en-US')} source pixels`
          );
        return { kind: 'link' };
      }
    };
  }
}
