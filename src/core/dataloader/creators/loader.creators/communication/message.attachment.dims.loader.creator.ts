import {
  DataLoaderCreator,
  DataLoaderCreatorOptions,
} from '@core/dataloader/creators/base';
import { Injectable } from '@nestjs/common';
import type { DocumentReferenceResult } from '@services/adapters/file-service-adapter/dto';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import {
  createMessageAttachmentDimsLoader,
  type MessageAttachmentDimsLoader,
} from './message.attachment.dims.loader';

// Re-exported as a TYPE so consumers get the loader's shape from the creator
// barrel. The factory itself deliberately stays out of that barrel:
// `LoaderCreatorModule` registers `Object.values(creators)` as providers, so a
// re-exported function would be handed to Nest as a provider.
export type { MessageAttachmentDimsLoader };

/**
 * DataLoader creator for the read path's authoritative image dimensions
 * (feature 013). One loader instance per GraphQL request — see
 * `createMessageAttachmentDimsLoader` for the batching contract.
 */
@Injectable()
export class MessageAttachmentDimsLoaderCreator
  implements DataLoaderCreator<DocumentReferenceResult | null>
{
  constructor(private readonly fileServiceAdapter: FileServiceAdapter) {}

  /**
   * `options` MUST be accepted and honoured — every other creator in this
   * directory takes it, and `DataLoaderInterceptor` always supplies it. The
   * field that matters here is `cache`: the interceptor sets it to FALSE for
   * websocket/subscription contexts, because a subscription's loader instance
   * is memoized on a connection-scoped GraphQL context and therefore outlives a
   * single read. Ignoring the flag (the previous no-arg `create()`) meant a
   * subscription got per-connection memoization of file-service's image
   * measurements — so a document whose bytes were replaced kept serving the old
   * dimensions for the life of the socket. Default to `true` so a non-GraphQL
   * caller (or a test) still gets the per-request coalescing.
   */
  public create(
    options?: DataLoaderCreatorOptions<DocumentReferenceResult | null>
  ): MessageAttachmentDimsLoader {
    return createMessageAttachmentDimsLoader(this.fileServiceAdapter, {
      cache: options?.cache ?? true,
    });
  }
}
