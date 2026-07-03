import { LogContext } from '@common/enums';
import { HEADER_ACTOR_ID } from '@core/auth/oidc/constants';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isAxiosError } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';

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
   * This is a cluster-internal call that bypasses the Traefik gateway, so the
   * adapter itself stamps the actor identity the WOPI service trusts via its
   * X-Alkemio-Actor-Id header (the gateway's alkemio-resolve forwardAuth does
   * the same for external callers).
   * Returns a ready-to-use editorUrl (constructed by the WOPI service).
   */
  async issueToken(
    documentId: string,
    actorID: string,
    actorName?: string
  ): Promise<WopiTokenResult> {
    const url = `${this.baseUrl}/wopi/token`;

    this.logger.verbose?.(
      `[WopiService] issueToken for document: ${documentId}`,
      LogContext.COLLABORATION
    );

    const request$ = this.httpService
      .post<WopiTokenResult>(
        url,
        // actorName is sent in the body (UTF-8, native) rather than a header
        // so arbitrary-Unicode names need no encoding. The WOPI service maps it
        // to the WOPI CheckFileInfo UserFriendlyName. Omitted when unknown
        // (e.g. anonymous), letting the WOPI service keep its own fallback.
        { documentId, actorName },
        {
          headers: {
            [HEADER_ACTOR_ID]: actorID,
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
          } else {
            this.logger.error?.(
              `[WopiService] issueToken failed: ${error.message ?? error}`,
              error.stack,
              LogContext.COLLABORATION
            );
          }
          throw error;
        })
      );

    return firstValueFrom(request$);
  }

  /**
   * Side-effect-free reachability check of the WOPI service (`GET /health`) — unlike
   * {@link issueToken} it mints no access token and records no analytics. Used by the editor
   * to distinguish a genuine save-path outage (WOPI down) from a cosmetic "unsaved" flag.
   * Returns false on any failure (unreachable / non-2xx / timeout).
   */
  async checkHealth(): Promise<boolean> {
    const url = `${this.baseUrl}/health`;
    // Must exceed the WOPI /health handler's own worst-case budget (a ~5s context that includes a
    // live Collabora probe up to ~2s) — a tighter timeout would report a slow-but-healthy service
    // as down and surface a spurious save-path outage in the editor. A genuinely-down service
    // fails fast (connection refused) regardless.
    const request$ = this.httpService.get(url).pipe(
      timeout({ first: 6000 }),
      map(response => response.status >= 200 && response.status < 300),
      catchError(() => of(false))
    );
    return firstValueFrom(request$);
  }
}
