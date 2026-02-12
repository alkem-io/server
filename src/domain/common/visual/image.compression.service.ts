import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { extname } from 'path';
import sharp from 'sharp';

export interface ImageCompressionResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

export const COMPRESSION_QUALITY = 82;
export const MAX_DIMENSION = 4096;
export const NON_COMPRESSIBLE_MIMES = [
  'image/svg+xml',
  'image/gif',
  'image/png',
  'image/x-png',
] as const;

@Injectable()
export class ImageCompressionService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Check if compression should be applied to this format.
   * Returns false for SVG, GIF, PNG, and other non-compressible formats.
   */
  public isCompressibleFormat(mimeType: string): boolean {
    return !NON_COMPRESSIBLE_MIMES.includes(
      mimeType.toLowerCase() as (typeof NON_COMPRESSIBLE_MIMES)[number]
    );
  }

  /**
   * Optimizes compressible images (JPEG, WebP): quality 80–85 MozJPEG,
   * resize if >4096px, auto-orient, strip EXIF.
   * Non-compressible formats (SVG, GIF, PNG) pass through unchanged.
   *
   * @throws ValidationException if compression fails
   */
  public async compressIfNeeded(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ImageCompressionResult> {
    const originalSize = buffer.length;

    if (!this.isCompressibleFormat(mimeType)) {
      return {
        buffer,
        mimeType,
        fileName,
        compressed: false,
        originalSize,
        finalSize: originalSize,
      };
    }

    const startTime = Date.now();
    try {
      let pipeline = sharp(buffer, { autoOrient: true });

      const metadata = await pipeline.metadata();
      const longestSide = Math.max(metadata.width ?? 0, metadata.height ?? 0);

      let resizeApplied = false;
      if (longestSide > MAX_DIMENSION) {
        pipeline = pipeline.resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        });
        resizeApplied = true;
      }

      const outputBuffer = await pipeline
        .jpeg({ quality: COMPRESSION_QUALITY, mozjpeg: true })
        .toBuffer();

      const outputFileName = this.ensureJpegExtension(fileName);
      const duration = Date.now() - startTime;

      this.logger.verbose?.(
        {
          message: 'Image optimized',
          originalSize,
          finalSize: outputBuffer.length,
          quality: COMPRESSION_QUALITY,
          resizeApplied,
          durationMs: duration,
        },
        LogContext.STORAGE_BUCKET
      );

      return {
        buffer: outputBuffer,
        mimeType: 'image/jpeg',
        fileName: outputFileName,
        compressed: true,
        originalSize,
        finalSize: outputBuffer.length,
      };
    } catch (error: unknown) {
      // Graceful fallback: log the error and return the uncompressed image
      // rather than blocking the upload entirely
      this.logger.warn?.(
        {
          message: 'Failed to compress image, storing uncompressed',
          fileSize: originalSize,
          mimeType,
          fileName,
          error: error instanceof Error ? error.message : String(error),
        },
        LogContext.STORAGE_BUCKET
      );

      return {
        buffer,
        mimeType,
        fileName,
        compressed: false,
        originalSize,
        finalSize: originalSize,
      };
    }
  }

  private ensureJpegExtension(fileName: string): string {
    const currentExt = extname(fileName).toLowerCase();
    if (currentExt === '.jpg' || currentExt === '.jpeg') return fileName;
    if (!currentExt) return `${fileName}.jpg`;
    return fileName.slice(0, -currentExt.length) + '.jpg';
  }
}
