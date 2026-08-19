import { createBatchLoader } from '@core/dataloader/utils/createTypedBatchLoader';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

/**
 * Result shape the memo-content loader yields, keyed by the memo's
 * `contentPointer` (the file-service snapshot id). `markdown` is the derived
 * rich text (`null` when the snapshot is missing / un-decodable).
 */
export interface MemoContentLoaderResult {
  id: string;
  markdown: string | null;
}

/**
 * Request-scoped DataLoader that derives memo `markdown` from file-service in ONE
 * batched round trip (R2/T007). Keys are `contentPointer`s; the batch calls
 * file-service `POST /internal/file/content-batch` (order preserved) and decodes
 * each stable Yjs-V2 snapshot to markdown for the read-only `Memo.markdown` field
 * (single-user / preview surfaces that do not join the live room). The raw base64
 * snapshot is NOT surfaced — the client reads live CRDT state from the room, never
 * over GraphQL. A page rendering N memos issues a single file-service request.
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
