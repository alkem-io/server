import type { ActorContextService } from '@core/actor-context/actor.context.service';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import type { AuthenticationService } from '@core/authentication/authentication.service';
import type { Request } from 'express';
import { type JWTVerifyGetKey } from 'jose';
import { type Mock, vi } from 'vitest';

import type { RevokedBearerBlocklistService } from './service-client-cache/revoked-bearer-blocklist.service';
import type {
  CachedServiceClient,
  ServiceClientCacheService,
} from './service-client-cache/service-client-cache.service';

/**
 * 004 T044 — Audit-emission contract for the FR-019 `request` event on
 * the service-principal admission path.
 *
 * Pins the **single-emission rule** in
 * `contracts/audit-event-service-actor.md`:
 *
 *   - Audience-denied SP request → exactly one `request` row with
 *     `denial_reason:"audience_not_admitted"` AND zero `scope_denial`
 *     rows for the same `request_id`.
 *   - Revoked-client SP request → one `request` row with
 *     `denial_reason:"bearer_revoked"` (status-flipped catalogue is
 *     indistinguishable from RFC-7009 revoke at the admission gate).
 *   - Revoked-bearer SP request → same `denial_reason:"bearer_revoked"`,
 *     same close-frame from T087 wiring (FR-011a path).
 *   - All SP-path emissions carry `actor_type:"service-client"`.
 *
 * Acceptance-side emission (`request{success}` after resolver returns)
 * is wired at the resolver/GraphQL middleware layer (T067/T068 area);
 * not exercised here. Missing-scope denials emit `scope_denial` from
 * T068 and suppress the `request` row — also not exercised here.
 *
 * Emitter intercepted by stubbing `process.stdout.write` so we read
 * the JSON-lines stream directly (matches the emitter contract:
 * audit goes to stdout for Filebeat ingestion).
 */

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  return { ...actual, jwtVerify: vi.fn() };
});

import { jwtVerify } from 'jose';

interface Harness {
  strategy: HydraBearerStrategy;
  cacheLookup: Mock;
  isBlocked: Mock;
  jwt: Mock;
}

const ISSUER = 'https://hydra.example.com/';
const STATIC_ALLOW_LIST = ['https://alkemio.example.com'];

const SAMPLE_CACHED_ENABLED: CachedServiceClient = {
  name: 'Analytics Pipeline',
  status: 'enabled',
  scopes: ['platform:read'],
  audience: 'analytics-pipeline',
  accessTokenLifetimeSeconds: 600,
  tokenEndpointAuthMethod: 'client_secret_basic',
};

function makeHarness(): Harness {
  const cacheLookup = vi.fn();
  const isBlocked = vi.fn().mockResolvedValue(false);
  const cache: Partial<ServiceClientCacheService> = { lookup: cacheLookup };
  const blocklist: Partial<RevokedBearerBlocklistService> = { isBlocked };
  const strategy = new HydraBearerStrategy(
    {} as unknown as JWTVerifyGetKey,
    STATIC_ALLOW_LIST,
    ISSUER,
    { createActorContext: vi.fn() } as unknown as AuthenticationService,
    {} as ActorContextService,
    cache as ServiceClientCacheService,
    blocklist as RevokedBearerBlocklistService
  );
  return { strategy, cacheLookup, isBlocked, jwt: vi.mocked(jwtVerify) };
}

function makeRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function jwtPayload(p: Record<string, unknown>) {
  return {
    payload: p,
    protectedHeader: { alg: 'RS256' },
  } as unknown as Awaited<ReturnType<typeof jwtVerify>>;
}

interface CapturedEvent {
  event_type: string;
  outcome: string;
  actor_type?: string;
  denial_reason?: string;
  service_client_id?: string;
  request_id: string;
}

function captureStdout(): {
  events: CapturedEvent[];
  restore: () => void;
} {
  const events: CapturedEvent[] = [];
  const realWrite = process.stdout.write.bind(process.stdout);
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      const line =
        typeof chunk === 'string' ? chunk : (chunk?.toString() ?? '');
      for (const raw of line.split('\n')) {
        const trimmed = raw.trim();
        if (trimmed.length === 0) continue;
        try {
          events.push(JSON.parse(trimmed) as CapturedEvent);
        } catch {
          // Non-JSON lines (logger output) — ignore.
        }
      }
      return true;
    });
  return {
    events,
    restore: () => {
      spy.mockRestore();
      // Defensive: re-bind the real write in case the harness didn't.
      process.stdout.write = realWrite as never;
    },
  };
}

describe('SP-path request audit (T044, single-emission rule)', () => {
  describe('audience denial', () => {
    it('emits exactly one request{denial_reason:"audience_not_admitted"} for the request_id', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          // Audience mismatches the cache row's clientId — FR-017 invariant
          // `aud == client_id` violated → audience_not_admitted.
          aud: 'some-other-audience',
          scope: 'platform:read',
          jti: 'jti-aud',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const cap = captureStdout();
      try {
        await expect(
          h.strategy.validate(makeRequest({ authorization: 'Bearer t' }))
        ).rejects.toThrow();
      } finally {
        cap.restore();
      }

      const requestEvents = cap.events.filter(e => e.event_type === 'request');
      expect(requestEvents).toHaveLength(1);
      expect(requestEvents[0]).toMatchObject({
        outcome: 'failure',
        actor_type: 'service-client',
        denial_reason: 'audience_not_admitted',
        service_client_id: 'analytics-pipeline',
      });

      const scopeDenials = cap.events.filter(
        e => e.event_type === 'scope_denial'
      );
      expect(scopeDenials).toHaveLength(0);
    });
  });

  describe('revoked client (catalogue status=disabled)', () => {
    it('emits exactly one request{denial_reason:"bearer_revoked"} and zero scope_denial rows', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce({
        ...SAMPLE_CACHED_ENABLED,
        status: 'disabled',
      });
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-disabled',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const cap = captureStdout();
      try {
        await expect(
          h.strategy.validate(makeRequest({ authorization: 'Bearer t' }))
        ).rejects.toThrow();
      } finally {
        cap.restore();
      }

      const requestEvents = cap.events.filter(e => e.event_type === 'request');
      expect(requestEvents).toHaveLength(1);
      expect(requestEvents[0]).toMatchObject({
        outcome: 'failure',
        actor_type: 'service-client',
        denial_reason: 'bearer_revoked',
        service_client_id: 'analytics-pipeline',
      });

      const scopeDenials = cap.events.filter(
        e => e.event_type === 'scope_denial'
      );
      expect(scopeDenials).toHaveLength(0);
    });
  });

  describe('revoked bearer (jti blocklist)', () => {
    it('emits exactly one request{denial_reason:"bearer_revoked"} and tags actor_type:"service-client"', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.isBlocked.mockResolvedValueOnce(true);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-blocked',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const cap = captureStdout();
      try {
        await expect(
          h.strategy.validate(makeRequest({ authorization: 'Bearer t' }))
        ).rejects.toThrow();
      } finally {
        cap.restore();
      }

      const requestEvents = cap.events.filter(e => e.event_type === 'request');
      expect(requestEvents).toHaveLength(1);
      expect(requestEvents[0]).toMatchObject({
        outcome: 'failure',
        actor_type: 'service-client',
        denial_reason: 'bearer_revoked',
        service_client_id: 'analytics-pipeline',
      });
    });
  });

  describe('successful admission', () => {
    it('does NOT emit a request row at the strategy layer (acceptance-side emission lands at the resolver hook)', async () => {
      // Per the single-emission rule + FR-022 scope-denial coexistence,
      // emitting `request{success}` at the strategy would race with the
      // resolver-layer scope-denial check (T067) which can still flip
      // the outcome to `scope_denial`. The acceptance-side `request{success}`
      // emission is therefore deferred to the resolver-completion hook
      // (T067/T068 wiring). This test pins the current contract: SP-path
      // admission alone produces NO `request` row.
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-ok',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const cap = captureStdout();
      try {
        const req = makeRequest({ authorization: 'Bearer t' });
        await h.strategy.validate(req);
        const sp = (
          req as Request & { servicePrincipal?: ServicePrincipalContext }
        ).servicePrincipal;
        expect(sp).toBeDefined();
      } finally {
        cap.restore();
      }

      const requestEvents = cap.events.filter(e => e.event_type === 'request');
      expect(requestEvents).toHaveLength(0);
    });
  });
});
