import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';

@Injectable()
export class MatrixMediaUploadClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AlkemioConfig, true>
  ) {}

  async upload(
    source: Readable,
    input: {
      actorID: string;
      displayName: string;
      mimeType: string;
      size: number;
    },
    signal?: AbortSignal
  ): Promise<{ mediaId: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ mediaId: string }>(
          `${this.config.get('communications.matrix.adapter_url', { infer: true }).replace(/\/$/, '')}/internal/media/upload`,
          source,
          {
            headers: {
              'Content-Length': input.size,
              'Content-Type': input.mimeType,
              'X-Alkemio-Actor-ID': input.actorID,
              'X-Alkemio-Display-Name': encodeURIComponent(input.displayName),
            },
            timeout: this.config.get(
              'communications.matrix.connection_timeout',
              { infer: true }
            ),
            signal,
            maxRedirects: 0,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        )
      );
      if (response.status !== 201 || !response.data.mediaId) {
        throw new Error('Incomplete media upload');
      }
      return { mediaId: response.data.mediaId };
    } catch {
      throw new ValidationException(
        'Attachment upload could not be completed',
        LogContext.COMMUNICATION
      );
    } finally {
      source.destroy();
    }
  }
}
