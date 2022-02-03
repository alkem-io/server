import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { UpdateVisualInput, CreateVisualInput } from '@domain/common/visual';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ReadStream } from 'fs';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs.exception';
import { streamToBuffer, getImageSize } from '@common/utils';
import { Visual } from './visual.entity';
import { IVisual } from './visual.interface';
import { DeleteVisualInput } from './dto/visual.dto.delete';
import { IpfsService } from '@src/services/platform/ipfs/ipfs.service';

@Injectable()
export class VisualService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>,
    private ipfsService: IpfsService
  ) {}

  async createVisual(
    visualInput: CreateVisualInput,
    initialUri?: string
  ): Promise<IVisual> {
    const visual: IVisual = Visual.create(visualInput);
    visual.authorization = new AuthorizationPolicy();
    if (initialUri) visual.uri = initialUri;
    await this.visualRepository.save(visual);
    return visual;
  }

  async updateVisual(visualData: UpdateVisualInput): Promise<IVisual> {
    const visual = await this.getVisualOrFail(visualData.visualID);
    if (visualData.uri || visualData.uri === '') {
      visual.uri = visualData.uri;
    }

    return await this.visualRepository.save(visual);
  }

  async deleteVisual(deleteData: DeleteVisualInput): Promise<IVisual> {
    const visualID = deleteData.ID;
    const visual = await this.getVisualOrFail(visualID);

    if (visual.authorization)
      await this.authorizationPolicyService.delete(visual.authorization);

    const { id } = visual;
    const result = await this.visualRepository.remove(visual as Visual);
    return {
      ...result,
      id,
    };
  }

  async getVisualOrFail(visualID: string): Promise<IVisual> {
    const visual = await this.visualRepository.findOne({
      id: visualID,
    });
    if (!visual)
      throw new EntityNotFoundException(
        `Not able to locate visual with the specified ID: ${visualID}`,
        LogContext.CHALLENGES
      );
    return visual;
  }

  async saveVisual(visual: IVisual): Promise<IVisual> {
    return await this.visualRepository.save(visual);
  }

  async uploadAvatar(
    visual: IVisual,
    readStream: ReadStream,
    fileName: string,
    mimetype: string
  ): Promise<IVisual> {
    this.validateMimeType(visual, mimetype);

    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.COMMUNITY
      );

    const buffer = await streamToBuffer(readStream);

    const { imageHeight, imageWidth } = await getImageSize(buffer);
    this.validateImageWidth(visual, imageWidth);
    this.validateImageHeight(visual, imageHeight);

    try {
      const uri = await this.ipfsService.uploadFileFromBuffer(buffer);
      const updateData: UpdateVisualInput = {
        visualID: visual.id,
        uri: uri,
      };
      return await this.updateVisual(updateData);
    } catch (error: any) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${error.message}`
      );
    }
  }

  private validateMimeType(visual: IVisual, mimeType: string) {
    if (!visual.allowedTypes.includes(mimeType)) {
      throw new ValidationException(
        `Image upload type (${mimeType}) not in allowed mime types: ${visual.allowedTypes}`,
        LogContext.COMMUNITY
      );
    }
  }

  private validateImageWidth(visual: IVisual, imageWidth: number) {
    if (imageWidth < visual.minWidth || imageWidth > visual.maxWidth)
      throw new ValidationException(
        `Upload image has a width resolution of '${imageWidth}' which is not in the allowed range of ${visual.minWidth} - ${visual.maxWidth} pixels!`,
        LogContext.COMMUNITY
      );
  }

  private validateImageHeight(visual: IVisual, imageHeight: number) {
    if (imageHeight < visual.minHeight || imageHeight > visual.maxHeight)
      throw new ValidationException(
        `Upload image has a height resolution of '${imageHeight}' which is not in the allowed range of ${visual.minHeight} - ${visual.maxHeight} pixels!`,
        LogContext.COMMUNITY
      );
  }

  async createVisualBanner(): Promise<IVisual> {
    return await this.createVisual({
      name: 'banner',
      minWidth: 384,
      maxWidth: 768,
      minHeight: 32,
      maxHeight: 128,
      aspectRatio: 6,
    });
  }

  async createVisualBannerNarrow(): Promise<IVisual> {
    return await this.createVisual({
      name: 'bannerNarrow',
      minWidth: 192,
      maxWidth: 384,
      minHeight: 32,
      maxHeight: 128,
      aspectRatio: 3,
    });
  }

  async createVisualAvatar(): Promise<IVisual> {
    return await this.createVisual({
      name: 'avatar',
      minWidth: 190,
      maxWidth: 400,
      minHeight: 190,
      maxHeight: 400,
      aspectRatio: 1,
    });
  }
}
