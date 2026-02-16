import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import convert from 'heic-convert';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { extname } from 'path';

export interface ImageConversionResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  converted: boolean;
}

export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const;
export const HEIC_FILE_EXTENSIONS = ['.heic', '.heif'] as const;

/** 15 MB in bytes */
const MAX_HEIC_FILE_SIZE = 15 * 1024 * 1024;

@Injectable()
export class ImageConversionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Check if a given MIME type or filename indicates HEIC/HEIF format.
   */
  public isHeicFormat(mimeType: string, fileName: string): boolean {
    const mimeMatch = HEIC_MIME_TYPES.includes(
      mimeType.toLowerCase() as (typeof HEIC_MIME_TYPES)[number]
    );
    if (mimeMatch) return true;

    const ext = extname(fileName).toLowerCase();
    return HEIC_FILE_EXTENSIONS.includes(
      ext as (typeof HEIC_FILE_EXTENSIONS)[number]
    );
  }

  /**
   * Converts HEIC/HEIF images to JPEG. Non-HEIC images pass through unchanged.
   *
   * @throws ValidationException if HEIC file exceeds 15 MB or conversion fails
   */
  public async convertIfNeeded(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ImageConversionResult> {
    if (!this.isHeicFormat(mimeType, fileName)) {
      return { buffer, mimeType, fileName, converted: false };
    }

    this.validateHeicFileSize(buffer.length);

    const startTime = Date.now();
    try {
      // heic-convert needs a Uint8Array at runtime (ArrayBuffer causes spread errors)
      // but @types/heic-convert declares ArrayBufferLike, so we cast
      const inputArray = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
      const jpegBuffer = await convert({
        buffer: inputArray as unknown as ArrayBufferLike,
        format: 'JPEG',
        quality: 1,
      });

      const outputBuffer = Buffer.from(jpegBuffer);
      const outputFileName = this.changeExtension(fileName, '.jpg');
      const duration = Date.now() - startTime;

      this.logger.verbose?.(
        {
          message: 'HEIC image converted to JPEG',
          sourceMimeType: mimeType,
          targetMimeType: 'image/jpeg',
          originalSize: buffer.length,
          convertedSize: outputBuffer.length,
          durationMs: duration,
        },
        LogContext.STORAGE_BUCKET
      );

      return {
        buffer: outputBuffer,
        mimeType: 'image/jpeg',
        fileName: outputFileName,
        converted: true,
      };
    } catch (error: unknown) {
      throw new ValidationException(
        'Failed to convert HEIC image',
        LogContext.STORAGE_BUCKET,
        {
          originalException: error,
          fileSize: buffer.length,
          mimeType,
          fileName,
        }
      );
    }
  }

  private validateHeicFileSize(size: number): void {
    if (size > MAX_HEIC_FILE_SIZE) {
      throw new ValidationException(
        'File size exceeds the maximum allowed size of 15MB for HEIC uploads',
        LogContext.STORAGE_BUCKET,
        {
          fileSize: size,
          maxSize: MAX_HEIC_FILE_SIZE,
        }
      );
    }
  }

  private changeExtension(fileName: string, newExt: string): string {
    const currentExt = extname(fileName);
    if (!currentExt) return `${fileName}${newExt}`;
    return fileName.slice(0, -currentExt.length) + newExt;
  }
}
