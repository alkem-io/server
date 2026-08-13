import type { DocumentReferenceResult } from '@services/adapters/file-service-adapter/dto';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MessageAttachmentDimsLoaderCreator } from './message.attachment.dims.loader.creator';

/**
 * `DataLoaderInterceptor` calls `creator.create({...options, authorize, cache})`
 * and sets `cache: false` for websocket/subscription contexts, whose GraphQL
 * context (and therefore the loader) is scoped to the CONNECTION, not to one
 * read. A creator that ignores the options silently gives a subscription
 * memoization it must not have.
 */
describe('MessageAttachmentDimsLoaderCreator', () => {
  const buildAdapter = () => {
    const getDocumentMetaBatch = vi.fn(async (ids: string[]) => {
      const map = new Map<string, DocumentReferenceResult>();
      for (const id of ids) {
        map.set(id, { id, imageWidth: 10, imageHeight: 20 } as any);
      }
      return map;
    });
    return {
      adapter: { getDocumentMetaBatch } as unknown as FileServiceAdapter,
      getDocumentMetaBatch,
    };
  };

  it('honours cache:false — a repeated key is re-fetched (subscription context)', async () => {
    const { adapter, getDocumentMetaBatch } = buildAdapter();
    const loader = new MessageAttachmentDimsLoaderCreator(adapter).create({
      cache: false,
    } as any);

    await loader.load('doc-1');
    await loader.load('doc-1');

    expect(getDocumentMetaBatch).toHaveBeenCalledTimes(2);
  });

  it('memoizes when cache is true (normal per-request query context)', async () => {
    const { adapter, getDocumentMetaBatch } = buildAdapter();
    const loader = new MessageAttachmentDimsLoaderCreator(adapter).create({
      cache: true,
    } as any);

    await loader.load('doc-1');
    await loader.load('doc-1');

    expect(getDocumentMetaBatch).toHaveBeenCalledTimes(1);
  });

  it('defaults to caching when no options are supplied (non-GraphQL caller)', async () => {
    const { adapter, getDocumentMetaBatch } = buildAdapter();
    const loader = new MessageAttachmentDimsLoaderCreator(adapter).create();

    await loader.load('doc-1');
    await loader.load('doc-1');

    expect(getDocumentMetaBatch).toHaveBeenCalledTimes(1);
  });

  it('still coalesces a batch when caching is disabled', async () => {
    const { adapter, getDocumentMetaBatch } = buildAdapter();
    const loader = new MessageAttachmentDimsLoaderCreator(adapter).create({
      cache: false,
    } as any);

    await loader.loadMany(['doc-1', 'doc-2', 'doc-3']);

    expect(getDocumentMetaBatch).toHaveBeenCalledTimes(1);
    expect(getDocumentMetaBatch).toHaveBeenCalledWith([
      'doc-1',
      'doc-2',
      'doc-3',
    ]);
  });
});
