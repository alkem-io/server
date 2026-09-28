import {
  Controller,
  Get,
  Inject,
  LoggerService,
  Optional,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogContext } from '@src/common/enums';
import { AlkemioConfig } from '@src/types';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { generators, type TokenSet } from 'openid-client';
import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_PATTERN,
  getCorrelationId,
  setCorrelationId,
} from '../../middleware/correlation-id.middleware';
import {
  type AppHandoffRecord,
  type MintedSessionBundle,
  redeemAppHandoff,
  storeAppHandoff,
} from './app-handoff.redis';
import { appRedirectSchemeFor } from './app-redirect-scheme';
import { emitAudit } from './audit';
import { APP_VERIFIER_HEADER } from './constants';
import { OidcService } from './oidc.service';
import { OIDC_REDIS_CLIENT } from './oidc.tokens';
import {
  PRE_AUTH_COOKIE_NAME,
  preAuthCookieAttributes,
  signPreAuthCookie,
  verifyPreAuthCookie,
} from './pre-auth-cookie';
import { validateReturnTo } from './returnto-validator';
import { sessionCookieClearOptions } from './session-cookie';
import {
  addSessionToSubIndex,
  removeSessionFromSubIndex,
} from './session-index.redis';
import {
  type AlkemioSessionPayload,
  type SessionStoreHandle,
} from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';

declare module 'express-session' {
  interface SessionData extends Partial<AlkemioSessionPayload> {}
}

const OIDC_SCOPE = 'openid profile email offline_access alkemio';

// FR-001 — the unpadded base64url length of a SHA-256 digest. A value that
// does not match is IGNORED rather than rejected, so a crafted link cannot
// turn someone's ordinary web login into a failure.
const APP_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// FR-012 — the one place an `app_signin` landing is the right destination:
// `/app-handoff` runs inside the app's own WebView, so the app renders it.
// Every app-mode exit from `/callback` goes back through the app scheme
// instead, because that handler runs in the external auth browser.
const APP_SIGNIN_FAILED_PATH = '/login?app_signin=failed';
const ERROR_HTML =
  '<!doctype html><meta charset="utf-8"><title>Authentication failed</title><p>Authentication failed.</p>';

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
  /**
   * Per-env session cookie name (`alkemio_session_sandbox`, …) resolved from
   * `oidc.cookie.name`. Logout / cookie-clear paths MUST use this — hardcoding
   * `alkemio_session` makes Set-Cookie clearance a no-op against the real
   * env-suffixed cookie in every non-default environment.
   */
  private readonly sessionCookieName: string;
  // FR-020a — absolute ceiling (seconds) from config (`oidc.cookie.absolute_ttl_s`,
  // default in alkemio.yml); stamped onto the session at login as
  // `absolute_expires_at`.
  private readonly sessionAbsoluteTtlS: number;
  /**
   * server#6315 — the cookie's `domain`, which every clear on this controller
   * used to omit. A clear whose domain does not match the set silently creates
   * a second cookie and leaves the original alive, so with a domain configured
   * (every deployed environment) sign-out did not actually sign the browser out.
   * Verified on a running server: the login set carried `Domain=…`, the logout
   * clear did not.
   */
  private readonly sessionCookieDomain: string | undefined;
  /**
   * FR-007 — the KRATOS session cookie's name, read from
   * `identity.authentication.providers.ory.session_cookie_name`. There is no
   * `providers.kratos` block in this config; reading one yields `undefined`
   * and a clear that silently misses.
   */
  private readonly kratosSessionCookieName: string;
  /**
   * FR-004 — the app's private-use callback scheme for THIS deployment,
   * derived from the session-cookie domain. `undefined` (every environment
   * without an app, and local dev) means app mode is unavailable, which is
   * the only thing `/login` needs to know (FR-002).
   *
   * Derived from `this.sessionCookieDomain`, which is already
   * `cookie.domain || undefined` — and that matters: `configuration.ts:43-59`
   * coerces an empty `${VAR}` to the NUMBER 0 (`isNaN('')` is false), which
   * `|| undefined` has already collapsed by the time the lookup runs. Never
   * add a typed `string` accessor for that value.
   */
  private readonly appRedirectScheme: string | undefined;
  constructor(
    private readonly oidcService: OidcService,
    configService: ConfigService<AlkemioConfig, true>,
    // server#6315 — index-maintenance failures are logged, never thrown
    // (FR-006). Winston + LogContext rather than `new Logger()`: these are the
    // records an operator greps for by `LogContext.AUTH` when a revocation
    // misses a session, and a bare Nest logger does not reach the configured
    // transports or APM.
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    // FR-022c — sessionStore optional because some test harnesses replace
    // OidcController via custom providers and don't wire SESSION_STORE_HANDLE.
    // When absent, tearDownSession falls back to legacy destroy-only behaviour
    // (no tombstone). Production wiring in OidcModule provides the handle.
    @Optional()
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore?: SessionStoreHandle,
    // server#6315 — the per-subject session index. Optional for the same reason
    // as `sessionStore` above: some test harnesses replace OidcController via
    // custom providers and wire neither. Without it the index simply is not
    // maintained from here; the self-healing write in CookieSessionStrategy
    // still catches the session on its next request.
    @Optional()
    @Inject(OIDC_REDIS_CLIENT)
    private readonly redis?: Redis
  ) {
    const cookie = configService.get(
      'identity.authentication.providers.oidc.cookie',
      { infer: true }
    );
    this.sessionCookieName = cookie.name;
    this.sessionAbsoluteTtlS = cookie.absolute_ttl_s;
    this.sessionCookieDomain = cookie.domain || undefined;
    this.kratosSessionCookieName = configService.get(
      'identity.authentication.providers.ory.session_cookie_name',
      { infer: true }
    );
    this.appRedirectScheme = appRedirectSchemeFor(this.sessionCookieDomain);
  }

  /**
   * server#6315 — index maintenance is best-effort at every call site (FR-006).
   * Login and logout must never fail because Redis hiccupped while updating an
   * index, so every call routes through these two wrappers, which log and
   * swallow. A stale member is harmless: a later revocation resolves it as
   * `already_absent`.
   */
  private async indexSession(
    sub: string | undefined,
    sid: string | undefined,
    absoluteExpiresAt: number
  ): Promise<void> {
    if (!this.redis || !sub || !sid) return;
    try {
      await addSessionToSubIndex(this.redis, sub, sid, absoluteExpiresAt);
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Failed to add session to subject index',
          sub,
          sid,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
    }
  }

  private async deindexSession(
    sub: string | undefined | null,
    sid: string | undefined
  ): Promise<void> {
    if (!this.redis || !sub || !sid) return;
    try {
      await removeSessionFromSubIndex(this.redis, sub, sid);
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Failed to prune session from subject index',
          sub,
          sid,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
    }
  }

  @Get('login')
  async login(
    @Query('returnTo') returnToRaw: string | undefined,
    @Query('app_challenge') appChallengeRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const validation = validateReturnTo(returnToRaw);
    const client = this.oidcService.getClient();
    const rpId = client.metadata.client_id ?? null;

    // FR-002/FR-003 — app mode is decided HERE and nowhere else, then carried
    // in the signed pre-auth cookie. Both gating inputs are process-static
    // (`appRedirectScheme` is constructor-computed, `redis` is an @Optional()
    // constructor injection), so deciding once at the start of the flow loses
    // nothing and leaves `/callback` with no availability branch at all.
    let appChallenge: string | undefined;
    let carriedReturnTo: string | undefined;
    if (Object.keys(req.query).length === 0) {
      // FR-003 — the Kratos `registration.after.oidc` re-entry is a BARE
      // `/login` with no query string, which is exactly why a query-only flag
      // is provably lost on the social sign-up leg. Carry the challenge AND
      // the returnTo: `login()` otherwise rebuilds returnTo from the query
      // alone, silently replacing the user's destination with `/`.
      //
      // RESIDUAL (ENG-079-SRV-02): this leg carries no state, nonce or query,
      // so it is indistinguishable from the re-entry of any OTHER flow live in
      // the same jar. A web sign-in parked at the IdP while an app sign-in is
      // started in the same (Android, Chrome-shared) jar therefore CAN come
      // back through here and inherit the app flow's mode and returnTo. No
      // discriminator exists at this point to separate them — a second cookie
      // slot would not help, because the re-entry cannot say which slot it
      // belongs to either — so the collision is accepted, not guarded. Owed to
      // spec §4 Q3 as a named residual.
      const cookieRaw = req.cookies?.[PRE_AUTH_COOKIE_NAME];
      if (typeof cookieRaw === 'string' && cookieRaw.length > 0) {
        try {
          const carried = await verifyPreAuthCookie(
            cookieRaw,
            this.oidcService.getPreAuthSigningKey()
          );
          if (carried.app_challenge) {
            appChallenge = carried.app_challenge;
            carriedReturnTo = carried.returnTo;
          }
        } catch {
          // An expired or tampered cookie simply does not carry a flow
          // forward; this is an ordinary web sign-in.
        }
      }
    } else if (
      typeof appChallengeRaw === 'string' &&
      APP_CHALLENGE_PATTERN.test(appChallengeRaw) &&
      this.appRedirectScheme !== undefined &&
      this.redis !== undefined &&
      // SEC-079-02 — app mode establishes no session in THIS jar and clears the
      // Kratos SSO cookie, so anyone who could put `?app_challenge=` in front of
      // a signed-in web user could sign them out of SSO with one link. The
      // shell launches its Custom Tab / ASWebAuthenticationSession as a
      // browser-initiated navigation (`Sec-Fetch-Site: none`); a link click from
      // another origin is `cross-site`, and that is the one value refused here.
      // Absent is ACCEPTED on purpose: Safari on the iOS 15 target sends no
      // such header, so this binds on Android/Chrome — where the shared Chrome
      // jar is what makes the attack reach a live session in the first place.
      req.headers['sec-fetch-site'] !== 'cross-site'
    ) {
      // Any `/login` carrying a query string starts a FRESH mode decision, so
      // an abandoned app flow in the same jar cannot bleed into it. The
      // query-less branch above is the leg where that guarantee does not hold.
      appChallenge = appChallengeRaw;
    }

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
        returnTo: carriedReturnTo ?? validation.value,
        issued_at: issuedAt,
        app_challenge: appChallenge,
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
      audience: 'alkemio-web',
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

    // FR-005 — app mode, and the only place it is read. `app_challenge` is
    // written by `/login` alone, and only when the scheme and the handoff
    // store were both available (FR-002), so neither narrowing below can fail
    // on a real call path; they are how TypeScript sees what FR-002 already
    // guarantees. From here on, EVERY exit out of this handler in app mode
    // returns to the app scheme — it runs in the external auth browser, so a
    // page rendered or a session established here reaches nobody.
    const appMode =
      preAuth.app_challenge && this.appRedirectScheme && this.redis
        ? {
            challenge: preAuth.app_challenge,
            scheme: this.appRedirectScheme,
            redis: this.redis,
          }
        : undefined;

    if (typeof queryState !== 'string' || queryState !== preAuth.state) {
      return rejectCallback(
        res,
        correlationId,
        rpId,
        'state_mismatch',
        appMode?.scheme
      );
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
      return rejectCallback(
        res,
        correlationId,
        rpId,
        'token_exchange_failed',
        appMode?.scheme
      );
    }

    const claims = tokenSet.claims();
    if (claims.nonce !== preAuth.nonce) {
      return rejectCallback(
        res,
        correlationId,
        rpId,
        'nonce_mismatch',
        appMode?.scheme
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const sub = String(claims.sub ?? '');
    const alkemioActorId =
      typeof claims.alkemio_actor_id === 'string'
        ? claims.alkemio_actor_id
        : null;
    const clientId = client.metadata.client_id ?? '';
    const targetReturnTo = validateReturnTo(preAuth.returnTo).value;

    const bundle: MintedSessionBundle = {
      access_token: tokenSet.access_token ?? '',
      id_token: tokenSet.id_token ?? '',
      refresh_token: tokenSet.refresh_token ?? '',
      expires_at: tokenSet.expires_at ?? now,
      scope: tokenSet.scope ?? null,
      sub,
      alkemio_actor_id: alkemioActorId,
      client_id: clientId,
    };

    if (appMode) {
      // FR-005 — establish NOTHING in this jar. The session belongs to the
      // app's WebView, which cannot see the auth browser's cookies.
      //
      // FR-007 — clear the Kratos session cookie with the full
      // {name, domain, path} triple. server#6315: a Set-Cookie that mismatches
      // any one of the three does not fail, it stores a SECOND cookie and
      // leaves the original alive — which is how a session survived sign-out
      // in every environment that configures a domain.
      res.cookie(this.kratosSessionCookieName, '', {
        domain: this.sessionCookieDomain,
        path: '/',
        maxAge: 0,
      });
      this.clearPreAuthCookie(res);

      let code: string;
      try {
        code = await storeAppHandoff(appMode.redis, {
          bundle,
          returnTo: targetReturnTo,
          app_challenge: appMode.challenge,
          issued_at: now,
          correlation_id: correlationId,
        });
      } catch {
        // An unhandled throw here would 500 inside the auth browser, emit
        // nothing, and strand a live Hydra/Kratos session.
        return rejectCallback(
          res,
          correlationId,
          rpId,
          'handoff_store_failed',
          appMode.scheme
        );
      }

      // SEC-079-01 — RFC 8252 §8.1: a private-use scheme is not claimed or
      // verified on Android, and the challenge this code is bound to was chosen
      // by whoever started the flow. So the verifier binding defeats
      // INTERCEPTION of a legitimate flow, but not a flow an attacker-installed
      // app initiates itself against a live Kratos session in the shared Chrome
      // jar. Owed to spec §9 as a named residual under the existing operator /
      // security-owner gate — NOT yet recorded there. The narrowing, if it is
      // ever taken, is an Android-only verified App Link; the iOS 15 target
      // cannot use one, which is why the scheme stays.
      res.redirect(302, `${appMode.scheme}:/auth/callback?code=${code}`);
      return;
    }

    await this.establishSession(req, res, bundle, {
      createdAt: now,
      correlationId,
      rpId,
    });

    res.redirect(302, targetReturnTo);
  }

  /**
   * workspace#079-app-sso-handoff FR-008…FR-012 — redeem a one-shot handoff
   * code from inside the app's WebView and establish the session THERE.
   *
   * Mounted relative to the `api/auth/oidc` controller prefix, so the wire
   * path is `/api/auth/oidc/app-handoff`: the shell hard-codes that string,
   * and the two decorators are what the cross-repo `app-handoff-wire` check
   * asserts.
   *
   * **This handler cannot throw.** Both of its awaits are guarded, and nothing
   * between them can reject. An unhandled rejection returns a raw Nest 500
   * into the app's MAIN FRAME — the thing FR-035/US3.3 forbid — with no audit
   * record and no counter movement, and the code is already burned by then so
   * there is no retry either. The two guards are separate rather than one
   * outer `try` because the closed error-code set distinguishes the store
   * being unreachable from the session store rejecting a save, and one catch
   * cannot tell those apart without a mutable phase flag.
   */
  @Get('app-handoff')
  async appHandoff(
    @Query('code') code: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const correlationId = ensureCorrelationId(req, res);
    const rpId = this.oidcService.getClient().metadata.client_id ?? null;
    // FR-012 — this handler runs in the WebView, so a landing the app itself
    // renders is the right destination for every failure.
    //
    // SEC-079-04 / NFR-005 — once a record has been redeemed the rejection is
    // attributable: `sub` and `client_id` name the account whose handoff was
    // replayed or forged, and `correlation_id` is the ORIGINATING flow's, not
    // this request's, so the rejection joins to the `/login` it targeted across
    // the jar boundary. `request_id` stays this request's id, which is the one
    // distinction between the two fields that this codebase actually needs.
    // Before a record is in hand (`store_unavailable`, `code_unknown`) there is
    // nothing to attribute to, and the fields fall back to null / this request.
    let record: AppHandoffRecord | null = null;
    const reject = (errorCode: string): void => {
      emitAudit({
        event_type: 'auth.app_handoff.rejected',
        outcome: 'failure',
        sub: record?.bundle.sub ?? null,
        client_id: record?.bundle.client_id ?? null,
        correlation_id: record?.correlation_id ?? correlationId,
        request_id: correlationId,
        error_code: errorCode,
        rp_id: rpId,
      });
      res.redirect(302, APP_SIGNIN_FAILED_PATH);
    };

    // FR-009 — burn the record on ANY attempt, before anything is validated.
    // Unknown query parameters are ignored exactly as on every other endpoint:
    // a request that spells the verifier as `?verifier=` therefore burns the
    // code and fails the compare below, which is already the behaviour FR-009
    // specifies — and rejecting it earlier would leave a stolen code live.
    try {
      if (!this.redis) return reject('handoff_store_unavailable');
      record = await redeemAppHandoff(
        this.redis,
        typeof code === 'string' ? code : ''
      );
    } catch {
      return reject('handoff_store_unavailable');
    }
    if (!record) return reject('code_unknown_or_expired');

    // FR-008 — Node lowercases incoming header names.
    const verifier = req.headers[APP_VERIFIER_HEADER.toLowerCase()];
    if (typeof verifier !== 'string' || verifier.length === 0) {
      return reject('verifier_missing');
    }

    // FR-010 — the app proves it is the instance that started the flow.
    const digest = createHash('sha256').update(verifier).digest('base64url');
    if (!constantTimeStringEqual(digest, record.app_challenge)) {
      return reject('verifier_mismatch');
    }

    try {
      // FR-011 — the SAME path a web login takes, with `created_at` pinned to
      // the handoff's issue time so subject-scoped revocation windows bind to
      // when the user actually authenticated.
      await this.establishSession(req, res, record.bundle, {
        createdAt: record.issued_at,
        correlationId,
        rpId,
      });
    } catch {
      // The code was burned in step 1, so the user's retry has to come from a
      // fresh sign-in rather than a replay of this one.
      return reject('session_establish_failed');
    }

    res.redirect(302, record.returnTo);
  }

  /**
   * Regenerate, populate, persist, re-index and announce a session — the whole
   * "the user is now signed in" step, shared verbatim by the web `/callback`
   * and the app `/app-handoff` (FR-011). The caller owns the redirect.
   */
  private async establishSession(
    req: Request,
    res: Response,
    bundle: MintedSessionBundle,
    ctx: { createdAt: number; correlationId: string; rpId: string | null }
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // server#6315 — `regenerate()` below destroys the current Redis session and
    // mints a fresh sid. Capture the OUTGOING pair first: the old sid is still
    // a member of its subject's index, and nothing else will ever remove it —
    // the paths that call `deindexSession` are logout and revocation, neither
    // of which runs on a re-login.
    //
    // Left behind, every re-login adds one phantom member. Beyond leaking
    // entries, a later revocation emits one `session.revoked` audit record per
    // phantom with `outcome=success`, padding the compliance trail with
    // sessions that had already ceased to exist.
    const previousSid = req.sessionID;
    const previousSub =
      typeof req.session?.sub === 'string' ? req.session.sub : null;

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate(err => {
        if (err) return reject(err);
        const s = req.session;
        s.access_token = bundle.access_token;
        s.id_token = bundle.id_token;
        s.refresh_token = bundle.refresh_token;
        s.expires_at = bundle.expires_at;
        s.absolute_expires_at = now + this.sessionAbsoluteTtlS;
        s.sub = bundle.sub;
        s.alkemio_actor_id = bundle.alkemio_actor_id;
        s.refresh_failure_count = 0;
        s.refresh_failure_streak_started_at = null;
        s.created_at = ctx.createdAt;
        s.client_id = bundle.client_id;
        s.request_context_cache = null;
        req.session.save(saveErr => (saveErr ? reject(saveErr) : resolve()));
      });
    });

    // Retire the sid `regenerate()` just destroyed. Guarded on the sid actually
    // having changed so a session store that reuses the id cannot make this
    // un-index the session we are in the middle of establishing.
    if (previousSid && previousSid !== req.sessionID) {
      await this.deindexSession(previousSub, previousSid);
    }

    // server#6315 / FR-002 — register the new session in its subject's index so
    // it can be revoked later. Without this there is no way to get from a
    // subject to that subject's sessions, which is the whole reason deleting a
    // user could not end their access. Best-effort: never fails the login.
    await this.indexSession(
      bundle.sub,
      req.sessionID,
      req.session.absolute_expires_at ?? now + this.sessionAbsoluteTtlS
    );

    this.clearPreAuthCookie(res);

    emitAudit({
      event_type: 'session.regenerated',
      outcome: 'success',
      sub: bundle.sub,
      client_id: bundle.client_id,
      correlation_id: ctx.correlationId,
      request_id: ctx.correlationId,
      rp_id: ctx.rpId,
    });
    emitAudit({
      event_type: 'auth.login.completed',
      outcome: 'success',
      sub: bundle.sub,
      client_id: bundle.client_id,
      correlation_id: ctx.correlationId,
      request_id: ctx.correlationId,
      granted_scope: bundle.scope,
      rp_id: ctx.rpId,
    });
  }

  private clearPreAuthCookie(res: Response): void {
    const attrs = preAuthCookieAttributes(this.oidcService.getCookieSecure());
    res.cookie(PRE_AUTH_COOKIE_NAME, '', {
      path: attrs.path,
      httpOnly: attrs.httpOnly,
      sameSite: attrs.sameSite,
      secure: attrs.secure,
      maxAge: 0,
    });
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
          // FR-022c — tombstone tagged with the triggering error_code so the
          // next request from a stale tab can be audited with the original
          // teardown reason.
          await this.tearDownSession(req, res, {
            tombstoneReason: `refresh_${outcome.error_code}`,
            sub: sub ?? undefined,
            clientId: clientId ?? undefined,
          });
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
      // FR-022c — tombstone with the terminal error_code so the next request
      // from a stale tab can be audited with the original teardown reason.
      await this.tearDownSession(req, res, {
        tombstoneReason: `refresh_${outcome.error_code}`,
        sub: sub ?? undefined,
        clientId: clientId ?? undefined,
      });
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

  // tearDownSession destroys the session and clears the cookie. When called
  // with a `tombstoneReason` (FR-022c system-side teardown) it ALSO writes a
  // tombstone payload via SESSION_STORE_HANDLE so the next request from a
  // stale tab cookie distinguishes "had-a-session-now-invalid" (state b →
  // 401 UNAUTHENTICATED) from "never-existed" (state a → anonymous). Logout
  // path passes no tombstoneReason → full destroy, no tombstone.
  private async tearDownSession(
    req: Request,
    res: Response,
    tombstone?: { tombstoneReason: string; sub?: string; clientId?: string }
  ): Promise<void> {
    const sid = req.sessionID;
    // server#6315 / FR-003 — capture `sub` BEFORE destroy: afterwards the
    // payload is gone and the index prune would silently target `undefined`.
    const subForIndex =
      tombstone?.sub ??
      (typeof req.session?.sub === 'string' ? req.session.sub : undefined);
    await new Promise<void>(resolve => {
      try {
        req.session.destroy(() => resolve());
      } catch {
        resolve();
      }
    });
    await this.deindexSession(subForIndex, sid);
    if (tombstone && this.sessionStore && sid) {
      try {
        await this.sessionStore.markTerminated(sid, tombstone.tombstoneReason, {
          sub: tombstone.sub,
          client_id: tombstone.clientId,
        });
      } catch {
        // Tombstone is best-effort — Redis errors mid-tombstone MUST NOT
        // abort cookie clearance. Stale tab will surface as state-(a)
        // anonymous on the next request, slight loss of distinguishability
        // but functionally correct.
      }
    }
    res.cookie(
      this.sessionCookieName,
      '',
      sessionCookieClearOptions({
        name: this.sessionCookieName,
        secure: this.oidcService.getCookieSecure(),
        domain: this.sessionCookieDomain,
      })
    );
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
    const hasSessionCookie = !!req.cookies?.[this.sessionCookieName];

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
      // server#6315 / FR-003 — read `sub` before destroy (see tearDownSession).
      const staleSub = typeof s?.sub === 'string' ? s.sub : undefined;
      const staleSid = req.sessionID;
      await new Promise<void>(resolve => {
        try {
          req.session.destroy(() => resolve());
        } catch {
          resolve();
        }
      });
      await this.deindexSession(staleSub, staleSid);
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
      res.cookie(
        this.sessionCookieName,
        '',
        sessionCookieClearOptions({
          name: this.sessionCookieName,
          secure: this.oidcService.getCookieSecure(),
          domain: this.sessionCookieDomain,
        })
      );
      const fallback =
        typeof postLogoutRedirectUri === 'string' && postLogoutRedirectUri
          ? postLogoutRedirectUri
          : '/';
      res.redirect(302, fallback);
      return;
    }
    // If the caller did not supply an `id_token_hint` query param but we have
    // one in the session, self-supply it. This makes a direct browser GET to
    // /api/auth/oidc/logout behave as "log me out" instead of returning 400.
    // The SPA still goes through useLogoutUrl → useIdTokenHint and submits the
    // hint explicitly (constant-time matched below) — that path is unchanged.
    // Trade-off: a small slice of logout-CSRF surface (an attacker site could
    // trigger this via top-level navigation), accepted as low-impact since the
    // local cleanup is anyway intended to be idempotent and unconditional.
    const effectiveHint =
      typeof hint === 'string' && hint.length > 0 ? hint : storedIdToken;
    if (!constantTimeStringEqual(effectiveHint, storedIdToken)) {
      res.status(400).json({ error: 'invalid_id_token_hint' });
      return;
    }

    const sub = typeof s.sub === 'string' ? s.sub : null;
    const clientId = typeof s.client_id === 'string' ? s.client_id : null;

    // FR-017d — local cleanup is unconditional and precedes Hydra redirect.
    // Redis errors mid-destroy MUST NOT abort cookie clearance.
    // server#6315 / FR-003 — `sub` is read above, before destroy, for the same
    // reason the index prune has to be.
    const logoutSid = req.sessionID;
    await new Promise<void>(resolve => {
      try {
        req.session.destroy(() => resolve());
      } catch {
        resolve();
      }
    });
    await this.deindexSession(sub, logoutSid);

    res.cookie(
      this.sessionCookieName,
      '',
      sessionCookieClearOptions({
        name: this.sessionCookieName,
        secure: this.oidcService.getCookieSecure(),
        domain: this.sessionCookieDomain,
      })
    );

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
    url.searchParams.set('id_token_hint', effectiveHint);
    // Always supply post_logout_redirect_uri. If the caller (SPA flow) did not
    // pass one, fall back to the SPA's /logout route — otherwise Hydra renders
    // its "Default Post Logout URL is not set" fallback page.
    const effectivePostLogout =
      typeof postLogoutRedirectUri === 'string' && postLogoutRedirectUri
        ? postLogoutRedirectUri
        : this.oidcService.getDefaultPostLogoutRedirectUri();
    url.searchParams.set('post_logout_redirect_uri', effectivePostLogout);
    res.redirect(302, url.toString());
  }
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * FR-013 — the shared rejection exit for `/callback`.
 *
 * With `appScheme` given (app mode, decided at `/login`), the 400 HTML page is
 * replaced by a 302 back into the app: this handler runs in the EXTERNAL AUTH
 * BROWSER, where a rendered page is a dead end the shell cannot observe.
 *
 * **Stated residual.** The two sites that fire before the pre-auth cookie is
 * verified — `pre_auth_cookie_missing` / `pre_auth_cookie_invalid` — do not
 * pass a scheme, because app mode is genuinely unknowable there.
 * `PRE_AUTH_COOKIE_MAX_AGE_S` is 600 s and a first-time IdP sign-up with 2FA
 * enrolment can exceed it, so a user CAN reach the 400 page in the auth
 * browser; they dismiss it and the shell counts a cancelled attempt.
 */
function rejectCallback(
  res: Response,
  correlationId: string,
  rpId: string | null,
  errorCode: string,
  appScheme?: string
): void {
  emitAudit({
    event_type: 'auth.login.callback_rejected',
    outcome: 'failure',
    correlation_id: correlationId,
    request_id: correlationId,
    error_code: errorCode,
    rp_id: rpId,
  });
  if (appScheme) {
    res.redirect(302, `${appScheme}:/auth/callback?error=${errorCode}`);
    return;
  }
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
