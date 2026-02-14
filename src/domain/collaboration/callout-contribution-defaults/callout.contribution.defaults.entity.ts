import { compressText, decompressText } from '@common/utils/compression.util';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICalloutContributionDefaults } from './callout.contribution.defaults.interface';

export class CalloutContributionDefaults
  extends BaseAlkemioEntity
  implements ICalloutContributionDefaults
{
  defaultDisplayName?: string;

  postDescription? = '';

  whiteboardContent?: string;

  async compressContent() {
    if (this.whiteboardContent) {
      this.whiteboardContent = await compressText(this.whiteboardContent);
    }
  }

  async decompressContent() {
    if (this.whiteboardContent) {
      this.whiteboardContent = await decompressText(this.whiteboardContent);
    }
  }
}
