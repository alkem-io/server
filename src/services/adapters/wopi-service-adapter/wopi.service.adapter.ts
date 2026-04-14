import { LogContext } from '@common/enums';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isAxiosError } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { catchError, firstValueFrom, map, timeout } from 'rxjs';

export interface WopiTokenResult {
  accessToken: string;
  accessTokenTTL: number;
  wopiSrc: string;
  editorUrl: string;
}

@Injectable()
export class WopiServiceAdapter {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.baseUrl = this.configService.get(
      'storage.collabora.wopi_service_url',
      {
        infer: true,
      }
    );
  }

  /**
   * Request a WOPI access token for a document.
   * Forwards the actor's JWT for Oathkeeper authentication on the WOPI service.
   * Returns a ready-to-use editorUrl (constructed by the WOPI service).
   */
  async issueToken(
    documentId: string,
    actorJWT: string
  ): Promise<WopiTokenResult> {
    const url = `${this.baseUrl}/wopi/token`;

    this.logger.verbose?.(
      `[WopiService] issueToken for document: ${documentId}`,
      LogContext.COLLABORATION
    );

    const request$ = this.httpService
      .post<WopiTokenResult>(
        url,
        { documentId },
        {
          headers: {
            Authorization: `Bearer ${actorJWT}`,
            'Content-Type': 'application/json',
          },
        }
      )
      .pipe(
        timeout({ first: 10000 }),
        map(response => {
          this.logger.verbose?.(
            `[WopiService] issueToken: success`,
            LogContext.COLLABORATION
          );
          return response.data;
        }),
        catchError(error => {
          if (isAxiosError(error) && error.response) {
            this.logger.warn?.(
              `[WopiService] issueToken failed: HTTP ${error.response.status}`,
              LogContext.COLLABORATION
            );
          }
          throw error;
        })
      );

    return firstValueFrom(request$);
  }
}
