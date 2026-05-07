import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { generators, type TokenSet } from 'openid-client';
import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_PATTERN,
  getCorrelationId,
  setCorrelationId,
} from '../../middleware/correlation-id.middleware';
import { emitAudit } from './audit';
import { OidcService } from './oidc.service';
import {
  PRE_AUTH_COOKIE_NAME,
  preAuthCookieAttributes,
  signPreAuthCookie,
  verifyPreAuthCookie,
} from './pre-auth-cookie';
import { validateReturnTo } from './returnto-validator';
import {
  type AlkemioSessionPayload,
  SESSION_ABSOLUTE_TTL_S,
} from './session-store.redis';

declare module 'express-session' {
  interface SessionData extends Partial<AlkemioSessionPayload> {}
}

const OIDC_SCOPE = 'openid profile email offline_access alkemio';
const ERROR_HTML =
  '<!doctype html><meta charset="utf-8"><title>Authentication failed</title><p>Authentication failed.</p>';
const SESSION_COOKIE_NAME = 'alkemio_session';

// FR-022c — teardown thresholds for persistent refresh failures.
const REFRESH_FAILURE_COUNT_THRESHOLD = 3;
const REFRESH_FAILURE_STREAK_SECONDS = 5 * 60;

// FR-022a — back-to-back dedupe window. If two requests arrive in quick
// succession on the same session, the second sees `last_refreshed_at` set
// by the first and short-circuits without calling Hydra. Refcount handles
// true overlap; this handles fast sequential cases (mocks, healthy network).
const REFRESH_DEDUP_WINDOW_SECONDS = 30;

type RefreshOutcome =
  | { kind: 'success'; tokenSet: TokenSet }
  | { kind: 'temporary'; error_code: string }
  | { kind: 'terminal'; error_code: string };

type RefreshInFlightEntry = {
  promise: Promise<RefreshOutcome>;
  refs: number;
};

// FR-022a — process-local single-flight map keyed by session id. The entry
// is reference-counted so concurrent handlers share a single Hydra call;
// the entry is removed only after the last awaiting handler completes its
// post-outcome work (rotation + session.save + response). When OidcModule
// grows a Redis dependency, swap for `acquireRefreshLock` from
// `refresh-lock.ts` (T010) with identical single-flight semantics.
const refreshInFlight = new Map<string, RefreshInFlightEntry>();

const TERMINAL_REFRESH_ERRORS = new Set([
  'invalid_grant',
  'invalid_client',
  'invalid_request',
  'unauthorized_client',
  'unsupported_grant_type',
]);

@Controller('api/auth/oidc')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  @Get('login')
  async login(
    @Query('returnTo') returnToRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const validation = validateReturnTo(returnToRaw);
    const client = this.oidcService.getClient();
    const rpId = client.metadata.client_id ?? null;

    if (validation.rejected) {
      emitAudit({
        event_type: 'auth.returnTo.rejected',
        outcome: 'warn',
        correlation_id: correlationId,
        request_id: correlationId,
        truncated_input: validation.truncatedInput ?? null,
        error_code: validation.reason ?? null,
        rp_id: rpId,
      });
    }

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const issuedAt = Math.floor(Date.now() / 1000);

    const cookieJws = await signPreAuthCookie(
      {
        state,
        nonce,
        code_verifier: codeVerifier,
        returnTo: validation.value,
        issued_at: issuedAt,
      },
      this.oidcService.getPreAuthSigningKey()
    );

    const attrs = preAuthCookieAttributes(this.oidcService.getCookieSecure());
    res.cookie(PRE_AUTH_COOKIE_NAME, cookieJws, {
      httpOnly: attrs.httpOnly,
      sameSite: attrs.sameSite,
      path: attrs.path,
      maxAge: attrs.maxAge,
      secure: attrs.secure,
    });

    const authorizationUrl = client.authorizationUrl({
      scope: OIDC_SCOPE,
      response_type: 'code',
      code_challenge_method: 'S256',
      state,
      nonce,
      code_challenge: codeChallenge,
      prompt: 'login',
    });

    emitAudit({
      event_type: 'auth.login.initiated',
      outcome: 'success',
      correlation_id: correlationId,
      request_id: correlationId,
      requested_scope: OIDC_SCOPE,
      rp_id: rpId,
    });

    res.redirect(302, authorizationUrl);
  }

  @Get('callback')
  async callback(
    @Query('state') queryState: string | undefined,
    @Query('code') queryCode: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const client = this.oidcService.getClient();
    const rpId = client.metadata.client_id ?? null;

    const cookieRaw = req.cookies?.[PRE_AUTH_COOKIE_NAME];
    if (typeof cookieRaw !== 'string' || cookieRaw.length === 0) {
      return rejectCallback(
        res,
        correlationId,
        rpId,
        'pre_auth_cookie_missing'
      );
    }

    let preAuth;
    try {
      preAuth = await verifyPreAuthCookie(
        cookieRaw,
        this.oidcService.getPreAuthSigningKey()
      );
    } catch {
      return rejectCallback(
        res,
        correlationId,
        rpId,
        'pre_auth_cookie_invalid'
      );
    }

    if (typeof queryState !== 'string' || queryState !== preAuth.state) {
      return rejectCallback(res, correlationId, rpId, 'state_mismatch');
    }

    let tokenSet: TokenSet;
    try {
      tokenSet = await client.callback(
        client.metadata.redirect_uris?.[0],
        { code: queryCode, state: queryState },
        {
          code_verifier: preAuth.code_verifier,
          nonce: preAuth.nonce,
          state: preAuth.state,
        }
      );
    } catch {
      return rejectCallback(res, correlationId, rpId, 'token_exchange_failed');
    }

    const claims = tokenSet.claims();
    if (claims.nonce !== preAuth.nonce) {
      return rejectCallback(res, correlationId, rpId, 'nonce_mismatch');
    }

    const now = Math.floor(Date.now() / 1000);
    const sub = String(claims.sub ?? '');
    const alkemioActorId =
      typeof claims.alkemio_actor_id === 'string'
        ? claims.alkemio_actor_id
        : null;
    const clientId = client.metadata.client_id ?? '';
    const targetReturnTo = validateReturnTo(preAuth.returnTo).value;

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate(err => {
        if (err) return reject(err);
        const s = req.session;
        s.access_token = tokenSet.access_token ?? '';
        s.id_token = tokenSet.id_token ?? '';
        s.refresh_token = tokenSet.refresh_token ?? '';
        s.expires_at = tokenSet.expires_at ?? now;
        s.absolute_expires_at = now + SESSION_ABSOLUTE_TTL_S;
        s.sub = sub;
        s.alkemio_actor_id = alkemioActorId;
        s.refresh_failure_count = 0;
        s.refresh_failure_streak_started_at = null;
        s.created_at = now;
        s.client_id = clientId;
        s.request_context_cache = null;
        req.session.save(saveErr => (saveErr ? reject(saveErr) : resolve()));
      });
    });

    const attrs = preAuthCookieAttributes(this.oidcService.getCookieSecure());
    res.cookie(PRE_AUTH_COOKIE_NAME, '', {
      path: attrs.path,
      httpOnly: attrs.httpOnly,
      sameSite: attrs.sameSite,
      secure: attrs.secure,
      maxAge: 0,
    });

    emitAudit({
      event_type: 'session.regenerated',
      outcome: 'success',
      sub,
      client_id: clientId,
      correlation_id: correlationId,
      request_id: correlationId,
      rp_id: rpId,
    });
    emitAudit({
      event_type: 'auth.login.completed',
      outcome: 'success',
      sub,
      client_id: clientId,
      correlation_id: correlationId,
      request_id: correlationId,
      granted_scope: tokenSet.scope ?? null,
      rp_id: rpId,
    });

    res.redirect(302, targetReturnTo);
  }

  @Get('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const client = this.oidcService.getClient();
    const rpId = client.metadata.client_id ?? null;
    const s = req.session;
    const refreshToken =
      typeof s?.refresh_token === 'string' ? s.refresh_token : '';
    if (!refreshToken) {
      res.status(401).json({ error: 'no_session' });
      return;
    }

    const sid = req.sessionID;
    const sub = typeof s.sub === 'string' ? s.sub : null;
    const clientId = typeof s.client_id === 'string' ? s.client_id : null;

    // FR-022a — skip if a successful rotation just happened on this session
    // (back-to-back dedupe). Refcount handles overlapping awaits; this handles
    // fast sequential bursts where the first handler fully completes before
    // the second enters.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const lastRefreshed =
      typeof s.last_refreshed_at === 'number' ? s.last_refreshed_at : null;
    if (
      lastRefreshed !== null &&
      nowEpoch - lastRefreshed < REFRESH_DEDUP_WINDOW_SECONDS
    ) {
      res.status(204).end();
      return;
    }

    let entry = refreshInFlight.get(sid);
    if (!entry) {
      const promise = (async (): Promise<RefreshOutcome> => {
        try {
          const ts = await client.refresh(refreshToken);
          return { kind: 'success', tokenSet: ts };
        } catch (err: unknown) {
          const code = extractErrorCode(err);
          if (code === 'temporarily_unavailable') {
            return { kind: 'temporary', error_code: code };
          }
          if (TERMINAL_REFRESH_ERRORS.has(code)) {
            return { kind: 'terminal', error_code: code };
          }
          // Unknown shape → treat as terminal (FR-022 default-deny).
          return { kind: 'terminal', error_code: code };
        }
      })();
      entry = { promise, refs: 0 };
      refreshInFlight.set(sid, entry);
    }
    entry.refs += 1;
    try {
      const outcome = await entry.promise;

      const now = Math.floor(Date.now() / 1000);

      if (outcome.kind === 'success') {
        const ts = outcome.tokenSet;
        // FR-008 — rotate RP-local tokens; absolute_expires_at preserved (14-day ceiling).
        s.access_token = ts.access_token ?? s.access_token;
        s.id_token = ts.id_token ?? s.id_token;
        s.refresh_token = ts.refresh_token ?? s.refresh_token;
        s.expires_at = ts.expires_at ?? now;
        s.refresh_failure_count = 0;
        s.refresh_failure_streak_started_at = null;
        s.last_refreshed_at = now;
        await new Promise<void>((resolve, reject) => {
          req.session.save(err => (err ? reject(err) : resolve()));
        });
        emitAudit({
          event_type: 'session.refresh.rotated',
          outcome: 'success',
          sub,
          client_id: clientId,
          correlation_id: correlationId,
          request_id: correlationId,
          rp_id: rpId,
        });
        res.status(204).end();
        return;
      }

      if (outcome.kind === 'temporary') {
        // FR-022 — do NOT rotate, do NOT tear down on a single transient blip.
        // FR-022c — count toward thresholds: 3 failures OR 5-min streak.
        const nextCount = (s.refresh_failure_count ?? 0) + 1;
        const streakStart = s.refresh_failure_streak_started_at ?? now;
        s.refresh_failure_count = nextCount;
        s.refresh_failure_streak_started_at = streakStart;

        const teardown =
          nextCount >= REFRESH_FAILURE_COUNT_THRESHOLD ||
          now - streakStart >= REFRESH_FAILURE_STREAK_SECONDS;

        if (teardown) {
          await this.tearDownSession(req, res);
          emitAudit({
            event_type: 'session.refresh_persistent_failure',
            outcome: 'failure',
            sub,
            client_id: clientId,
            correlation_id: correlationId,
            request_id: correlationId,
            rp_id: rpId,
            error_code: outcome.error_code,
          });
          res.status(401).json({ error: 'session_terminated' });
          return;
        }

        await new Promise<void>((resolve, reject) => {
          req.session.save(err => (err ? reject(err) : resolve()));
        });
        emitAudit({
          event_type: 'session.refresh.temporarily_unavailable',
          outcome: 'warn',
          sub,
          client_id: clientId,
          correlation_id: correlationId,
          request_id: correlationId,
          rp_id: rpId,
          error_code: outcome.error_code,
        });
        res.status(503).json({ error: 'temporarily_unavailable' });
        return;
      }

      // outcome.kind === 'terminal' — invalid_grant / invalid_client / etc.
      await this.tearDownSession(req, res);
      emitAudit({
        event_type: 'session.refresh_persistent_failure',
        outcome: 'failure',
        sub,
        client_id: clientId,
        correlation_id: correlationId,
        request_id: correlationId,
        rp_id: rpId,
        error_code: outcome.error_code,
      });
      res.status(401).json({ error: 'session_terminated' });
    } finally {
      entry.refs -= 1;
      if (entry.refs === 0 && refreshInFlight.get(sid) === entry) {
        refreshInFlight.delete(sid);
      }
    }
  }

  private async tearDownSession(req: Request, res: Response): Promise<void> {
    await new Promise<void>(resolve => {
      try {
        req.session.destroy(() => resolve());
      } catch {
        resolve();
      }
    });
    res.cookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.oidcService.getCookieSecure(),
      maxAge: 0,
    });
  }

  @Get('id-token-hint')
  async idTokenHint(@Req() req: Request, @Res() res: Response): Promise<void> {
    ensureCorrelationId(req, res);
    const s = req.session;
    const now = Math.floor(Date.now() / 1000);
    const idToken = typeof s?.id_token === 'string' ? s.id_token : '';
    const breached =
      typeof s?.absolute_expires_at === 'number' && now > s.absolute_expires_at;
    if (!idToken || breached) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ id_token: idToken });
  }

  @Get('logout')
  async logout(
    @Query('id_token_hint') hint: string | undefined,
    @Query('post_logout_redirect_uri') postLogoutRedirectUri:
      | string
      | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const client = this.oidcService.getClient();
    const rpId = client.metadata.client_id ?? null;
    const s = req.session;
    const storedIdToken = typeof s?.id_token === 'string' ? s.id_token : '';
    const hasSessionCookie = !!req.cookies?.[SESSION_COOKIE_NAME];

    // FR-017d — local cleanup is unconditional. Idempotent path: if there is
    // no live OIDC session (no stored id_token) we still clear any lingering
    // session cookie. We deliberately do NOT redirect to Hydra in this branch
    // since we have no id_token_hint to submit and Hydra would fall through
    // to the logout-consent UI. Behaviour:
    //   - had a stale cookie: clear it, 302 to post_logout target so the SPA
    //     can re-render with credentials gone.
    //   - had no cookie at all: nothing to clear; respond 204 so the SPA can
    //     break out of any retry loop and render the logged-out state.
    if (!storedIdToken) {
      await new Promise<void>(resolve => {
        try {
          req.session.destroy(() => resolve());
        } catch {
          resolve();
        }
      });
      emitAudit({
        event_type: 'session.ended',
        outcome: 'success',
        sub: null,
        client_id: null,
        correlation_id: correlationId,
        request_id: correlationId,
        rp_id: rpId,
        error_code: hasSessionCookie ? 'stale_cookie' : 'no_session',
      });
      if (!hasSessionCookie) {
        res.status(204).end();
        return;
      }
      res.cookie(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: this.oidcService.getCookieSecure(),
        maxAge: 0,
      });
      const fallback =
        typeof postLogoutRedirectUri === 'string' && postLogoutRedirectUri
          ? postLogoutRedirectUri
          : '/';
      res.redirect(302, fallback);
      return;
    }
    if (typeof hint !== 'string' || hint.length === 0) {
      res.status(400).json({ error: 'missing_id_token_hint' });
      return;
    }
    if (!constantTimeStringEqual(hint, storedIdToken)) {
      res.status(400).json({ error: 'invalid_id_token_hint' });
      return;
    }

    const sub = typeof s.sub === 'string' ? s.sub : null;
    const clientId = typeof s.client_id === 'string' ? s.client_id : null;

    // FR-017d — local cleanup is unconditional and precedes Hydra redirect.
    // Redis errors mid-destroy MUST NOT abort cookie clearance.
    await new Promise<void>(resolve => {
      try {
        req.session.destroy(() => resolve());
      } catch {
        resolve();
      }
    });

    res.cookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.oidcService.getCookieSecure(),
      maxAge: 0,
    });

    emitAudit({
      event_type: 'session.ended',
      outcome: 'success',
      sub,
      client_id: clientId,
      correlation_id: correlationId,
      request_id: correlationId,
      rp_id: rpId,
    });

    const issuerMeta = this.oidcService.getIssuer().metadata as {
      end_session_endpoint?: string;
    };
    const endSessionEndpoint = issuerMeta.end_session_endpoint;
    if (!endSessionEndpoint) {
      res.status(500).json({ error: 'end_session_endpoint_not_configured' });
      return;
    }
    const url = new URL(endSessionEndpoint);
    url.searchParams.set('id_token_hint', hint);
    if (typeof postLogoutRedirectUri === 'string' && postLogoutRedirectUri) {
      url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
    }
    res.redirect(302, url.toString());
  }
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function rejectCallback(
  res: Response,
  correlationId: string,
  rpId: string | null,
  errorCode: string
): void {
  emitAudit({
    event_type: 'auth.login.callback_rejected',
    outcome: 'failure',
    correlation_id: correlationId,
    request_id: correlationId,
    error_code: errorCode,
    rp_id: rpId,
  });
  res.status(400).type('html').send(ERROR_HTML);
}

function extractErrorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { error?: unknown; message?: unknown };
    if (typeof e.error === 'string' && e.error.length > 0) return e.error;
    if (typeof e.message === 'string' && e.message.length > 0) return e.message;
  }
  return 'unknown';
}

function ensureCorrelationId(req: Request, res: Response): string {
  const existing = getCorrelationId(req);
  if (existing) {
    res.setHeader(CORRELATION_ID_HEADER, existing);
    return existing;
  }
  const headerValue = req.header(CORRELATION_ID_HEADER);
  const id =
    typeof headerValue === 'string' && CORRELATION_ID_PATTERN.test(headerValue)
      ? headerValue
      : randomUUID();
  setCorrelationId(req, id);
  res.setHeader(CORRELATION_ID_HEADER, id);
  return id;
}
