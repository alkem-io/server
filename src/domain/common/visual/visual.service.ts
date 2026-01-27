import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { UpdateVisualInput } from '@domain/common/visual/dto/visual.dto.update';
import { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { getImageDimensions, streamToBuffer } from '@common/utils';
import { Visual } from './visual.entity';
import { IVisual } from './visual.interface';
import { DeleteVisualInput } from './dto/visual.dto.delete';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Readable } from 'stream';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { StorageUploadFailedException } from '@common/exceptions/storage/storage.upload.failed.exception';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { VisualType } from '@common/enums/visual.type';
import { DEFAULT_VISUAL_CONSTRAINTS } from './visual.constraints';

@Injectable()
export class VisualService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>
  ) {}

  public createVisual(
    visualInput: CreateVisualInput,
    initialUri?: string
  ): IVisual {
    if (!visualInput.type) {
      throw new ValidationException(
        'Visual type (name) must be provided when creating a visual.',
        LogContext.COMMUNITY
      );
    }
    const visual: IVisual = Visual.create({
      ...visualInput,
      uri: initialUri ?? '',
    });

    visual.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.VISUAL
    );

    if (initialUri) {
      visual.uri = initialUri;
    }

    return visual;
  }

  async updateVisual(visualData: UpdateVisualInput): Promise<IVisual> {
    const visual = await this.getVisualOrFail(visualData.visualID);
    visual.uri = visualData.uri;
    if (visualData.alternativeText !== undefined) {
      visual.alternativeText = visualData.alternativeText;
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

  async uploadImageOnVisual(
    visual: IVisual,
    storageBucket: IStorageBucket,
    readStream: Readable,
    fileName: string,
    mimetype: string,
    userID: string
  ): Promise<IDocument | never> {
    this.validateMimeType(visual, mimetype);

    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.DOCUMENT
      );

    const buffer = await streamToBuffer(readStream);

    const { imageHeight, imageWidth } = await this.getImageDimensions(buffer);
    this.validateImageWidth(visual, imageWidth);
    this.validateImageHeight(visual, imageHeight);
    const documentForVisual = await this.documentService.getDocumentFromURL(
      visual.uri
    );

    try {
      const newDocument =
        await this.storageBucketService.uploadFileAsDocumentFromBuffer(
          storageBucket.id,
          buffer,
          fileName,
          mimetype,
          userID
        );
      // Delete the old document
      if (
        documentForVisual &&
        newDocument.externalID != documentForVisual?.externalID
      ) {
        await this.documentService.deleteDocument({
          ID: documentForVisual.id,
        });
      }
      return newDocument;
    } catch (error: any) {
      throw new StorageUploadFailedException(
        'Upload on visual failed!',
        LogContext.STORAGE_BUCKET,
        {
          message: error.message,
          fileName,
          visualID: visual.id,
          originalException: error,
        }
      );
    }
  }

  async getVisualOrFail(
    visualID: string,
    options?: FindOneOptions<Visual>
  ): Promise<IVisual> {
    const visual = await this.visualRepository.findOne({
      where: { id: visualID },
      ...options,
    });
    if (!visual)
      throw new EntityNotFoundException(
        `Not able to locate visual with the specified ID: ${visualID}`,
        LogContext.SPACES
      );
    return visual;
  }

  async saveVisual(visual: IVisual): Promise<IVisual> {
    return await this.visualRepository.save(visual);
  }

  public async getImageDimensions(buffer: Buffer) {
    return getImageDimensions(buffer);
  }

  public validateMimeType(visual: IVisual, mimeType: string) {
    if (!visual.allowedTypes.includes(mimeType)) {
      throw new ValidationException(
        `Image upload type (${mimeType}) not in allowed mime types: ${visual.allowedTypes}`,
        LogContext.COMMUNITY
      );
    }
  }

  public validateImageWidth(visual: IVisual, imageWidth: number) {
    if (imageWidth < visual.minWidth || imageWidth > visual.maxWidth)
      throw new ValidationException(
        `Upload image has a width resolution of '${imageWidth}' which is not in the allowed range of ${visual.minWidth} - ${visual.maxWidth} pixels!`,
        LogContext.COMMUNITY
      );
  }

  public validateImageHeight(visual: IVisual, imageHeight: number) {
    if (imageHeight < visual.minHeight || imageHeight > visual.maxHeight)
      throw new ValidationException(
        `Upload image has a height resolution of '${imageHeight}' which is not in the allowed range of ${visual.minHeight} - ${visual.maxHeight} pixels!`,
        LogContext.COMMUNITY
      );
  }

  public createVisualBanner(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.BANNER,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER],
      },
      uri
    );
  }

  public createVisualWhiteboardPreview(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.WHITEBOARD_PREVIEW,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.WHITEBOARD_PREVIEW],
      },
      uri
    );
  }

  public createVisualCard(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.CARD,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.CARD],
      },
      uri
    );
  }

  public createVisualBannerWide(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.BANNER_WIDE,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER_WIDE],
      },
      uri
    );
  }

  public createVisualAvatar(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.AVATAR,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR],
      },
      uri
    );
  }

  public createVisualMediaGalleryImage(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.MEDIA_GALLERY_IMAGE,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.MEDIA_GALLERY_IMAGE],
      },
      uri
    );
  }

  public createVisualMediaGalleryVideo(uri?: string): IVisual {
    return this.createVisual(
      {
        type: VisualType.MEDIA_GALLERY_VIDEO,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.MEDIA_GALLERY_VIDEO],
      },
      uri
    );
  }
}
