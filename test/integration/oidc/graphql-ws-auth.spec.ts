import {
  buildGraphqlWsRequest,
  type GraphqlWsConnectionContext,
} from '@core/auth/oidc/graphql-ws-auth';
import { describe, expect, it } from 'vitest';

// FR-023 (WS addendum) — auth credentials must come from the HTTP upgrade only.
// The graphql-ws connectionParams payload (post-upgrade) MUST NOT bleed into
// the headers the auth strategies see. T051 — full WS handshake is exercised
// by the Stage-1 Playwright (T057); here we pin the request-shape invariant
// that is the entire surface the strategies authenticate against.
describe('GraphQL-WS upgrade auth (FR-023, T051)', () => {
  function ctx(
    upgradeHeaders: Record<string, string | string[]>,
    connectionParams?: Record<string, unknown>
  ): GraphqlWsConnectionContext {
    return {
      extra: {
        request: {
          headers: upgradeHeaders,
        } as GraphqlWsConnectionContext['extra']['request'],
      },
      connectionParams,
    };
  }

  it('preserves upgrade-time Authorization header for the Bearer path', () => {
    const req = buildGraphqlWsRequest(
      ctx({ authorization: 'Bearer real-jwt' })
    );
    expect(req.headers.authorization).toBe('Bearer real-jwt');
  });

  it('preserves upgrade-time Cookie header for the cookie-session path', () => {
    const req = buildGraphqlWsRequest(
      ctx({ cookie: 'alkemio_session=opaque-sid' })
    );
    expect(req.headers.cookie).toBe('alkemio_session=opaque-sid');
  });

  it('does NOT merge connectionParams.headers — token smuggling attempt blocked', () => {
    const req = buildGraphqlWsRequest(
      ctx(
        {},
        {
          headers: { authorization: 'Bearer smuggled-jwt' },
        }
      )
    );
    expect(req.headers.authorization).toBeUndefined();
  });

  it('exposes connectionParams on req for non-auth telemetry', () => {
    const req = buildGraphqlWsRequest(ctx({}, { operationName: 'foo' }));
    expect(req.connectionParams?.operationName).toBe('foo');
  });

  it('headers object is a copy — mutating req.headers does not leak into the upgrade record', () => {
    const upgrade = { authorization: 'Bearer original' };
    const req = buildGraphqlWsRequest(ctx(upgrade));
    (req.headers as Record<string, string>).authorization = 'Bearer hijacked';
    expect(upgrade.authorization).toBe('Bearer original');
  });
});
