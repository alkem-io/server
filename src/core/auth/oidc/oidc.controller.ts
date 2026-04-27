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
        undefined,
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

    if (!storedIdToken) {
      res
        .status(400)
        .json({ error: hasSessionCookie ? 'session_not_found' : 'no_session' });
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
