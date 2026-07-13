import { LogContext } from '@common/enums';
import { HEADER_ACTOR_ID } from '@core/auth/oidc/constants';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isAxiosError } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  catchError,
  firstValueFrom,
  map,
  type Observable,
  of,
  timeout,
} from 'rxjs';

export interface WopiTokenResult {
  accessToken: string;
  accessTokenTTL: number;
  wopiSrc: string;
  editorUrl: string;
}

export interface WopiLockStatusResult {
  locked: boolean;
  expiresAt?: string;
}

/**
 * Outcome of a lock-status check:
 * - `locked`      — the document is genuinely locked (someone is editing).
 * - `unlocked`    — the document is free to replace.
 * - `unavailable` — the check could not be completed (transient error / unreadable
 *                   response); callers should fail-closed but say the check failed
 *                   rather than claiming an active edit.
 * A missing lock-status route (HTTP 404) is deliberately reported as `unlocked`, not
 * `unavailable`: that is a stale/misconfigured wopi-service, and a deployment fault
 * must not permanently block replace.
 */
export type WopiLockCheck = 'locked' | 'unlocked' | 'unavailable';

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

  /**
   * Read-only check of whether a document currently has a non-expired WOPI
   * lock (i.e. it is actively being edited in Collabora). Used to block an
   * in-place backing-file replace while someone is editing (FR-013).
   *
   * `documentId` is the file-service `Document.id`, which is the WOPI
   * `file_id`. This is a cluster-internal call that bypasses the Traefik
   * gateway, so the adapter stamps the actor identity via the
   * X-Alkemio-Actor-Id header exactly as {@link issueToken} does.
   *
   * FAIL-CLOSED: on ANY error (timeout / non-2xx / parse) the call logs and
   * returns `true` (treat as locked). Refusing the swap when the signal is
   * unavailable is the conservative choice — it prevents an unsafe swap
   * during a wopi-service outage, at the cost of temporarily blocking
   * replaces. This is why wopi-service must ship before this mutation
   * (rollout ordering). See contracts/wopi-lock-status.md.
   */
  async getLockStatus(documentId: string): Promise<WopiLockCheck> {
    const url = `${this.baseUrl}/wopi/files/${documentId}/lock-status`;

    this.logger.verbose?.(
      `[WopiService] getLockStatus for document: ${documentId}`,
      LogContext.COLLABORATION
    );

    const request$ = this.httpService
      .get<WopiLockStatusResult>(url, {
        headers: {
          // No actor body/token needed; still stamp the trusted actor header
          // for parity with the other cluster-internal WOPI calls. The check
          // is document-scoped and read-only.
          [HEADER_ACTOR_ID]: 'system',
        },
      })
      .pipe(
        timeout({ first: 10000 }),
        map((response): WopiLockCheck => {
          const locked = response.data?.locked;
          if (typeof locked !== 'boolean') {
            // A 200 without a boolean `locked` is an unreadable answer: we can't
            // claim the document is free, but we also can't honestly claim it is
            // being edited — report the check as unavailable so the caller can
            // say so rather than inventing an active edit.
            this.logger.warn?.(
              `[WopiService] getLockStatus: malformed response body for ${documentId}, treating as unavailable`,
              LogContext.COLLABORATION
            );
            return 'unavailable';
          }
          this.logger.verbose?.(
            `[WopiService] getLockStatus: locked=${locked}`,
            LogContext.COLLABORATION
          );
          return locked ? 'locked' : 'unlocked';
        }),
        catchError((error): Observable<WopiLockCheck> => {
          // A definitive 404 means the lock-status route is absent — a
          // stale/misconfigured wopi-service, not an active edit. A deployment
          // fault must not silently block every replace, so proceed (report
          // `unlocked`) but log loudly so the drift is caught.
          if (isAxiosError(error) && error.response?.status === 404) {
            this.logger.error?.(
              `[WopiService] getLockStatus: lock-status route missing (HTTP 404) for ${documentId}; the wopi-service is stale or misconfigured. Skipping the active-edit guard for this replace — deploy the lock-status endpoint.`,
              error.stack,
              LogContext.COLLABORATION
            );
            return of('unlocked');
          }
          // Any other error means we genuinely could not confirm lock state
          // (transient HTTP error, network failure, timeout): report the check
          // as unavailable so the caller fails closed but tells the truth.
          if (isAxiosError(error) && error.response) {
            this.logger.warn?.(
              `[WopiService] getLockStatus failed (check unavailable): HTTP ${error.response.status}`,
              LogContext.COLLABORATION
            );
          } else {
            this.logger.error?.(
              `[WopiService] getLockStatus failed (check unavailable): ${error.message ?? error}`,
              error.stack,
              LogContext.COLLABORATION
            );
          }
          return of('unavailable');
        })
      );

    return firstValueFrom(request$);
  }
}
