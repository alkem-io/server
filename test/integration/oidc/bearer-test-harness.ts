import { ActorContextService } from '@core/actor-context/actor.context.service';
import {
  BEARER_AUD_ALLOW_LIST_HANDLE,
  BEARER_JWKS_HANDLE,
  HYDRA_ISSUER_URL_HANDLE,
  HydraBearerStrategy,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import { AUTH_STRATEGY_OIDC_HYDRA_BEARER } from '@core/auth/oidc/strategies/strategy.names';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
  SignJWT,
} from 'jose';
import passport from 'passport';
import { vi } from 'vitest';

export const HYDRA_TEST_ISSUER = 'http://hydra.example';

export type BearerHarness = {
  app: INestApplication;
  signToken(claims?: Partial<JWTPayload>, opts?: SignOptions): Promise<string>;
  setAllowList(list: string[]): void;
  // raw audit lines captured during the test
  audit: string[];
};

type SignOptions = {
  alg?: string;
  kid?: string;
  expiresIn?: string;
  notBefore?: string | number;
  issuer?: string;
};

const DEFAULT_ALLOW_LIST = [
  'alkemio-web',
  'synapse-client',
  'element-client',
  'ecosystem-analytics',
];

export async function createBearerHarness(
  init: { allowList?: string[]; issuer?: string } = {}
): Promise<BearerHarness> {
  const issuer = init.issuer ?? HYDRA_TEST_ISSUER;
  const allowList = [...(init.allowList ?? DEFAULT_ALLOW_LIST)];

  // Generate a single RSA-256 keypair the test owns end to end. The strategy
  // receives a JWKS function we control here, and the helper signs tokens with
  // the matching private key.
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const publicJwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-kid' };
  const jwksFn: JWTVerifyGetKey = async () => publicKey as KeyLike;

  const audit: string[] = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      if (typeof chunk === 'string') audit.push(chunk);
      return true;
    });

  // Mutable allow-list reference passed to DI; tests can swap.
  const allowListRef: { current: string[] } = { current: allowList };

  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: BEARER_JWKS_HANDLE, useValue: jwksFn },
      { provide: BEARER_AUD_ALLOW_LIST_HANDLE, useValue: allowListRef.current },
      { provide: HYDRA_ISSUER_URL_HANDLE, useValue: issuer },
      {
        provide: AuthenticationService,
        useValue: {
          createActorContext: vi.fn(async (id: string) => ({
            isAnonymous: false,
            credentials: [],
            actorID: id,
          })),
        },
      },
      {
        provide: ActorContextService,
        useValue: {
          createAnonymous: vi.fn(() => ({
            isAnonymous: true,
            credentials: [],
          })),
        },
      },
      HydraBearerStrategy,
    ],
  }).compile();

  // Register the strategy globally on passport via @nestjs/passport mixin.
  moduleRef.get(HydraBearerStrategy);

  const app = moduleRef.createNestApplication();
  app.use(express.json());
  app.use(passport.initialize());
  app.use(
    '/api/private/graphql',
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        AUTH_STRATEGY_OIDC_HYDRA_BEARER,
        { session: false },
        (err: unknown, user: unknown) => {
          if (err) return next(err);
          if (!user) {
            res.status(401).json({ error: 'unauthenticated' });
            return;
          }
          (req as Request & { user?: unknown }).user = user;
          next();
        }
      )(req, res, next);
    },
    (req: Request, res: Response) => {
      res.status(200).json({
        data: { me: { id: (req as Request & { user?: any }).user?.actorID } },
      });
    }
  );
  await app.init();

  // Vitest cleanup: restore stdout spy via teardown registered by caller's
  // afterEach — we expose audit + the spy is mock-restored on app.close()
  // via the wrapper below.
  const closeOrig = app.close.bind(app);
  app.close = async () => {
    stdoutSpy.mockRestore();
    await closeOrig();
  };

  void publicJwk;

  return {
    app,
    audit,
    setAllowList(next) {
      allowListRef.current.length = 0;
      allowListRef.current.push(...next);
    },
    async signToken(claims = {}, opts = {}) {
      const now = Math.floor(Date.now() / 1000);
      const payload: JWTPayload = {
        sub: 'sub-kratos-1',
        alkemio_actor_id: 'actor-1',
        iat: now,
        exp: now + 600,
        iss: opts.issuer ?? issuer,
        aud: 'alkemio-web',
        ...claims,
      };
      const jwt = new SignJWT(payload)
        .setProtectedHeader({
          alg: opts.alg ?? 'RS256',
          kid: opts.kid ?? 'test-kid',
        })
        .setIssuedAt(payload.iat as number)
        .setExpirationTime(payload.exp as number);
      if (payload.iss) jwt.setIssuer(payload.iss as string);
      if (payload.aud)
        jwt.setAudience(
          Array.isArray(payload.aud)
            ? (payload.aud as string[])
            : (payload.aud as string)
        );
      if (payload.sub) jwt.setSubject(payload.sub as string);
      if (opts.notBefore !== undefined) jwt.setNotBefore(opts.notBefore);
      return jwt.sign(privateKey as KeyLike);
    },
  };
}

export function findAuditEvent(
  audit: string[],
  eventType: string
): Record<string, unknown> | undefined {
  for (const line of audit) {
    for (const part of line.split('\n')) {
      if (!part) continue;
      try {
        const obj = JSON.parse(part) as Record<string, unknown>;
        if (obj.event_type === eventType) return obj;
      } catch {
        // not a JSON line
      }
    }
  }
  return undefined;
}
