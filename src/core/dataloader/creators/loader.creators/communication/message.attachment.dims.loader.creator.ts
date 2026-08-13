import { DataLoaderCreator } from '@core/dataloader/creators/base';
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

  public create(): MessageAttachmentDimsLoader {
    return createMessageAttachmentDimsLoader(this.fileServiceAdapter);
  }
}
