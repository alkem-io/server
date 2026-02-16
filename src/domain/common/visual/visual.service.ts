import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { StorageUploadFailedException } from '@common/exceptions/storage/storage.upload.failed.exception';
import { getImageDimensions, streamToBuffer } from '@common/utils';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';
import { UpdateVisualInput } from '@domain/common/visual/dto/visual.dto.update';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { DeleteVisualInput } from './dto/visual.dto.delete';
import { ImageCompressionService } from './image.compression.service';
import { ImageConversionService } from './image.conversion.service';
import {
  DEFAULT_VISUAL_CONSTRAINTS,
  VISUAL_ALLOWED_TYPES,
} from './visual.constraints';
import { Visual } from './visual.entity';
import { IVisual } from './visual.interface';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { visuals } from './visual.schema';

@Injectable()
export class VisualService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private imageConversionService: ImageConversionService,
    private imageCompressionService: ImageCompressionService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public createVisual(
    visualInput: CreateVisualInput,
    initialUri?: string
  ): IVisual {
    if (!visualInput.name) {
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

    const [updated] = await this.db
      .update(visuals)
      .set({
        uri: visual.uri,
        alternativeText: visual.alternativeText,
      })
      .where(eq(visuals.id, visual.id))
      .returning();
    return updated as unknown as IVisual;
  }

  async deleteVisual(deleteData: DeleteVisualInput): Promise<IVisual> {
    const visualID = deleteData.ID;
    const visual = await this.getVisualOrFail(visualID);

    if (visual.authorization)
      await this.authorizationPolicyService.delete(visual.authorization);

    await this.db.delete(visuals).where(eq(visuals.id, visual.id));
    return visual;
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

    // Stage 1: HEIC/HEIF → JPEG conversion
    const conversionResult = await this.imageConversionService.convertIfNeeded(
      buffer,
      mimetype,
      fileName
    );

    // Stage 2: Optimize compressible images (JPEG, WebP)
    const compressionResult =
      await this.imageCompressionService.compressIfNeeded(
        conversionResult.buffer,
        conversionResult.mimeType,
        conversionResult.fileName
      );

    const processedBuffer = compressionResult.buffer;
    const processedMimeType = compressionResult.mimeType;
    const processedFileName = compressionResult.fileName;

    const { imageHeight, imageWidth } =
      await this.getImageDimensions(processedBuffer);
    this.validateImageWidth(visual, imageWidth);
    this.validateImageHeight(visual, imageHeight);
    const documentForVisual = await this.documentService.getDocumentFromURL(
      visual.uri
    );

    try {
      const newDocument =
        await this.storageBucketService.uploadFileAsDocumentFromBuffer(
          storageBucket.id,
          processedBuffer,
          processedFileName,
          processedMimeType,
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
          fileName: processedFileName,
          originalFileName: fileName,
          visualID: visual.id,
          originalException: error,
        }
      );
    }
  }

  async getVisualOrFail(visualID: string): Promise<IVisual> {
    const visual = await this.db.query.visuals.findFirst({
      where: eq(visuals.id, visualID),
    });
    if (!visual)
      throw new EntityNotFoundException(
        `Not able to locate visual with the specified ID: ${visualID}`,
        LogContext.SPACES
      );
    return visual as unknown as IVisual;
  }

  async saveVisual(visual: IVisual): Promise<IVisual> {
    if (visual.id) {
      const [updated] = await this.db
        .update(visuals)
        .set({
          name: visual.name,
          uri: visual.uri,
          minWidth: visual.minWidth,
          maxWidth: visual.maxWidth,
          minHeight: visual.minHeight,
          maxHeight: visual.maxHeight,
          aspectRatio: visual.aspectRatio.toString(),
          allowedTypes: visual.allowedTypes,
          alternativeText: visual.alternativeText,
          sortOrder: visual.sortOrder,
        })
        .where(eq(visuals.id, visual.id))
        .returning();
      return updated as unknown as IVisual;
    } else {
      const [inserted] = await this.db
        .insert(visuals)
        .values({
          id: visual.id,
          name: visual.name,
          uri: visual.uri,
          minWidth: visual.minWidth,
          maxWidth: visual.maxWidth,
          minHeight: visual.minHeight,
          maxHeight: visual.maxHeight,
          aspectRatio: visual.aspectRatio.toString(),
          allowedTypes: visual.allowedTypes,
          alternativeText: visual.alternativeText,
          sortOrder: visual.sortOrder,
          authorizationId: visual.authorization?.id,
        })
        .returning();
      return inserted as unknown as IVisual;
    }
  }

  public async getImageDimensions(buffer: Buffer) {
    return getImageDimensions(buffer);
  }

  public validateMimeType(visual: IVisual, mimeType: string) {
    // Check both the stored allowedTypes on the entity AND the current
    // DEFAULT_VISUAL_CONSTRAINTS. This ensures existing Visual entities
    // with stale allowedTypes (missing HEIC/HEIF) still accept new formats
    // without requiring a database migration.
    const currentDefaults =
      DEFAULT_VISUAL_CONSTRAINTS[
        visual.name as keyof typeof DEFAULT_VISUAL_CONSTRAINTS
      ];
    const allowedByDefaults = currentDefaults
      ? (currentDefaults.allowedTypes as readonly string[])
      : VISUAL_ALLOWED_TYPES;

    if (
      !visual.allowedTypes.includes(mimeType) &&
      !allowedByDefaults.includes(mimeType)
    ) {
      throw new ValidationException(
        'Image upload type not in allowed mime types',
        LogContext.COMMUNITY,
        {
          mimeType,
          allowedTypes: [...visual.allowedTypes],
        }
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
        name: VisualType.BANNER,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER],
      },
      uri
    );
  }

  public createVisualWhiteboardPreview(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.WHITEBOARD_PREVIEW,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.WHITEBOARD_PREVIEW],
      },
      uri
    );
  }

  public createVisualCard(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.CARD,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.CARD],
      },
      uri
    );
  }

  public createVisualBannerWide(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.BANNER_WIDE,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER_WIDE],
      },
      uri
    );
  }

  public createVisualAvatar(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.AVATAR,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR],
      },
      uri
    );
  }

  public createVisualMediaGalleryImage(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.MEDIA_GALLERY_IMAGE,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.MEDIA_GALLERY_IMAGE],
      },
      uri
    );
  }

  public createVisualMediaGalleryVideo(uri?: string): IVisual {
    return this.createVisual(
      {
        name: VisualType.MEDIA_GALLERY_VIDEO,
        ...DEFAULT_VISUAL_CONSTRAINTS[VisualType.MEDIA_GALLERY_VIDEO],
      },
      uri
    );
  }
}
