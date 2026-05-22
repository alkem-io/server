import { ActorContextService } from '@core/actor-context/actor.context.service';
import { BearerValidationError } from '@core/auth/oidc/strategies/auth.errors';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import {
  BEARER_AUD_ALLOW_LIST_HANDLE,
  BEARER_JWKS_HANDLE,
  HYDRA_ISSUER_URL_HANDLE,
  HydraBearerValidator,
} from '@core/auth/oidc/strategies/hydra-bearer.validator';
import { AUTH_STRATEGY_OIDC_HYDRA_BEARER } from '@core/auth/oidc/strategies/strategy.names';
import { AuthenticationService } from '@core/authentication/authentication.service';
import {
  type INestApplication,
  type NestApplicationOptions,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { emitAudit } from '@src/core/auth/oidc/audit';
import { RevokedBearerBlocklistService } from '@src/platform-admin/domain/service-clients/service-client-cache/revoked-bearer-blocklist.service';
import {
  type CachedServiceClient,
  ServiceClientCacheService,
} from '@src/platform-admin/domain/service-clients/service-client-cache/service-client-cache.service';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import passport from 'passport';
import { vi } from 'vitest';

import {
  type SeededServiceClient,
  seedServiceClient,
} from '../../fixtures/seed-service-client';

/**
 * 004 T042 — Service-principal integration harness.
 *
 * Composes:
 *   - `HydraBearerStrategy` w/ the T045 seed fixture's JWKS feeding
 *     `BEARER_JWKS_HANDLE`,
 *   - A stub `ServiceClientCacheService.lookup` returning the fixture's
 *     `cachedView()` (so the SP branch admits),
 *   - A stub `RevokedBearerBlocklistService.isBlocked` (configurable),
 *   - An express handler at `/api/private/graphql` that exercises a
 *     minimal scope-decision in lieu of the T067 resolver-layer guard:
 *     `platform:read` → 200; otherwise → 403 with the FR-016
 *     `FORBIDDEN_SCOPE` shape that distinguishes from `UNAUTHENTICATED`
 *     and emits the FR-022 `scope_denial` event (suppressing `request`
 *     per the single-emission rule, per the T044 contract).
 *
 * This stub will be retired when T067/T068 land — at that point the
 * harness composes the real resolver-layer guard and the express stub
 * goes away. For now it exists so US1 can be exercised end-to-end on the
 * SP admission path.
 */

const HYDRA_TEST_ISSUER = 'http://hydra.example';

export interface SpHarness {
  app: INestApplication;
  seed: SeededServiceClient;
  audit: string[];
  /** Update the in-test cache mock (e.g., flip status:disabled mid-test). */
  setCacheLookup: (
    resolver: (clientId: string) => CachedServiceClient | null
  ) => void;
  /** Toggle blocklist behaviour for FR-011a single-bearer-revoke tests. */
  setBlocklist: (resolver: (jti: string) => boolean) => void;
}

export interface SpHarnessOptions {
  seedSpec?: Parameters<typeof seedServiceClient>[0];
  audAllowList?: string[];
  issuer?: string;
  nestOptions?: NestApplicationOptions;
}

export async function createSpHarness(
  opts: SpHarnessOptions = {}
): Promise<SpHarness> {
  const seed = await seedServiceClient(opts.seedSpec);
  // Default audience allow-list = the seed's audience (FR-017: audience = clientId).
  const audAllowList = opts.audAllowList ?? [seed.row.audience];
  const issuer = opts.issuer ?? HYDRA_TEST_ISSUER;

  const audit: string[] = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      if (typeof chunk === 'string') audit.push(chunk);
      return true;
    });

  // Cache + blocklist are mutable so tests can re-bind mid-flight.
  let cacheLookupImpl: (clientId: string) => CachedServiceClient | null =
    clientId => (clientId === seed.row.clientId ? seed.cachedView() : null);
  let blocklistImpl: (jti: string) => boolean = () => false;

  const cacheStub: Partial<ServiceClientCacheService> = {
    lookup: vi.fn(async (cid: string) => cacheLookupImpl(cid)),
  };
  const blocklistStub: Partial<RevokedBearerBlocklistService> = {
    isBlocked: vi.fn(async (jti: string) => blocklistImpl(jti)),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: BEARER_JWKS_HANDLE, useValue: seed.jwks },
      { provide: BEARER_AUD_ALLOW_LIST_HANDLE, useValue: audAllowList },
      { provide: HYDRA_ISSUER_URL_HANDLE, useValue: issuer },
      {
        provide: AuthenticationService,
        useValue: { createActorContext: vi.fn() },
      },
      { provide: ActorContextService, useValue: {} },
      { provide: ServiceClientCacheService, useValue: cacheStub },
      { provide: RevokedBearerBlocklistService, useValue: blocklistStub },
      HydraBearerValidator,
      HydraBearerStrategy,
    ],
  }).compile();

  moduleRef.get(HydraBearerStrategy);

  const app = moduleRef.createNestApplication(opts.nestOptions);
  app.use(express.json());
  app.use(passport.initialize());
  app.use(
    '/api/private/graphql',
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        AUTH_STRATEGY_OIDC_HYDRA_BEARER,
        { session: false },
        (err: unknown) => {
          if (err instanceof BearerValidationError) {
            res.status(401).json({
              errors: [
                {
                  message: err.message,
                  extensions: {
                    code: 'UNAUTHENTICATED',
                    error_code: err.errorCode,
                  },
                },
              ],
            });
            return;
          }
          if (err) return next(err);
          next();
        }
      )(req, res, next);
    },
    (req: Request, res: Response) => {
      const sp = (
        req as Request & { servicePrincipal?: ServicePrincipalContext }
      ).servicePrincipal;
      if (sp === undefined) {
        // The strategy returned null with no SP context (e.g., user
        // bearer w/o platform identity for the test) — surface as
        // UNAUTHENTICATED so US1 contract holds.
        res
          .status(401)
          .json({ errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] });
        return;
      }

      // Minimal scope-decision stub: tests post a body containing
      // `requiredScope` so we can drive both in-scope (200) and
      // out-of-scope (403) flows from a single endpoint. Replaced when
      // T067 lands.
      const requiredScope: string =
        (req.body as { requiredScope?: string } | undefined)?.requiredScope ??
        'platform:read';

      const requestId =
        typeof req.headers['x-request-id'] === 'string'
          ? (req.headers['x-request-id'] as string)
          : `req-${Date.now()}-${Math.random()}`;
      const operationId: string =
        (req.body as { operationName?: string } | undefined)?.operationName ??
        'AnonymousQuery';

      if (!sp.grantedScopes.includes(requiredScope)) {
        // FR-022 — `scope_denial` row carries the request envelope AND
        // `missing_scope`. Per the single-emission rule (T044), this
        // suppresses the `request` row for the same request_id —
        // emission happens exclusively here.
        emitAudit({
          event_type: 'scope_denial',
          outcome: 'failure',
          actor_type: 'service-client',
          sub: sp.clientId,
          client_id: sp.clientId,
          service_client_id: sp.clientId,
          correlation_id: requestId,
          request_id: requestId,
          operation_identifier: operationId,
          payload: { missing_scope: requiredScope },
        });
        res.status(403).json({
          errors: [
            {
              message: `missing required scope: ${requiredScope}`,
              extensions: {
                code: 'FORBIDDEN_SCOPE',
                missing_scope: requiredScope,
              },
            },
          ],
        });
        return;
      }

      // FR-019 — accepted operation emits one `request{success}` row.
      emitAudit({
        event_type: 'request',
        outcome: 'success',
        actor_type: 'service-client',
        sub: sp.clientId,
        client_id: sp.clientId,
        service_client_id: sp.clientId,
        correlation_id: requestId,
        request_id: requestId,
        operation_identifier: operationId,
        granted_scope: sp.grantedScopes.join(' '),
      });
      res
        .status(200)
        .json({ data: { stub: { clientId: sp.clientId, name: sp.name } } });
    }
  );

  await app.init();

  const closeOrig = app.close.bind(app);
  app.close = async () => {
    stdoutSpy.mockRestore();
    await closeOrig();
  };

  return {
    app,
    seed,
    audit,
    setCacheLookup: resolver => {
      cacheLookupImpl = resolver;
    },
    setBlocklist: resolver => {
      blocklistImpl = resolver;
    },
  };
}

export function findAuditEvents(
  audit: string[],
  eventType: string
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const chunk of audit) {
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        if (obj.event_type === eventType) out.push(obj);
      } catch {
        // non-JSON
      }
    }
  }
  return out;
}
