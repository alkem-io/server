import { createBatchLoader } from '@core/dataloader/utils/createTypedBatchLoader';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

/**
 * Result shape the memo-content loader yields, keyed by the memo's
 * `contentPointer` (the file-service snapshot id). `markdown` is the derived
 * rich text and `contentBase64` the raw Yjs-V2 snapshot (both `null` when the
 * snapshot is missing / un-decodable).
 */
export interface MemoContentLoaderResult {
  id: string;
  markdown: string | null;
  contentBase64: string | null;
}

/**
 * Request-scoped DataLoader that derives memo `markdown` (and the base64 Yjs
 * snapshot) from file-service in ONE batched round trip (R2/T007). Keys are
 * `contentPointer`s; the batch calls file-service `POST /internal/file/content-batch`
 * (order preserved) and decodes each Yjs-V2 snapshot to markdown. Replaces the
 * dropped inline `memo.content` read in `memo.resolver.fields` so a page rendering
 * N memos issues a single file-service request instead of N.
 */
@Injectable()
export class MemoContentLoaderCreator
  implements DataLoaderCreator<MemoContentLoaderResult>
{
  constructor(private readonly fileServiceAdapter: FileServiceAdapter) {}

  create(options: DataLoaderCreatorOptions<MemoContentLoaderResult>) {
    return createBatchLoader<MemoContentLoaderResult>(
      async (pointers: ReadonlyArray<string>) => {
        const items = await this.fileServiceAdapter.getContentBatch([
          ...pointers,
        ]);
        // The endpoint preserves order, but map defensively by id so a
        // re-ordered / partial response still resolves correctly.
        return items
          .filter(item => item.found && item.contentBase64)
          .map(item => ({
            id: item.id,
            contentBase64: item.contentBase64 as string,
            markdown: this.decode(item.contentBase64 as string),
          }));
      },
      {
        name: this.constructor.name,
        loadedTypeName: 'MemoContent',
        // A missing/un-decodable snapshot resolves to null markdown rather than
        // erroring the whole field (FR-007 — flagged, never a hard failure).
        resolveToNull: options.resolveToNull ?? true,
      }
    );
  }

  private decode(contentBase64: string): string | null {
    try {
      return yjsStateToMarkdown(Buffer.from(contentBase64, 'base64'));
    } catch {
      return null;
    }
  }
}
