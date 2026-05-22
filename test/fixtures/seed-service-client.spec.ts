import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { seedServiceClient } from './seed-service-client';

/**
 * Smoke test for the T045 fixture. Asserts the shaped row + cached view
 * are mutually consistent and the test-owned JWT round-trips against
 * the fixture's own JWKS. Real consumers wire the JWKS into
 * `BEARER_JWKS_HANDLE` so the strategy validates these tokens.
 */
describe('seed-service-client fixture (T045)', () => {
  it('produces a TypeORM row whose fields mirror the cached view', async () => {
    const seed = await seedServiceClient({
      clientId: 'analytics-pipeline',
      name: 'Analytics Pipeline',
      scopes: ['platform:read', 'analytics:read'],
    });

    expect(seed.row.clientId).toBe('analytics-pipeline');
    expect(seed.row.name).toBe('Analytics Pipeline');
    expect(seed.row.scopes?.map(s => s.scopeName)).toEqual([
      'platform:read',
      'analytics:read',
    ]);

    const cached = seed.cachedView();
    expect(cached).toEqual({
      name: 'Analytics Pipeline',
      status: 'enabled',
      scopes: ['platform:read', 'analytics:read'],
      audience: 'analytics-pipeline',
      accessTokenLifetimeSeconds: 600,
      tokenEndpointAuthMethod: 'client_secret_basic',
    });
  });

  it('mints a JWT verifiable against its own JWKS — sub/aud/scope match the seed', async () => {
    const seed = await seedServiceClient({
      clientId: 'pipeline-a',
      scopes: ['platform:read'],
    });

    const token = await seed.signToken();
    const { payload } = await jwtVerify(token, seed.jwks, {
      issuer: 'http://hydra.example',
    });

    expect(payload.sub).toBe('pipeline-a');
    expect(payload.aud).toBe('pipeline-a');
    expect(payload.client_id).toBe('pipeline-a');
    expect(payload.scope).toBe('platform:read');
    // No alkemio_actor_id — service principals never carry it (FR-013).
    expect(payload.alkemio_actor_id).toBeUndefined();
  });

  it('honours signToken overrides for negative-test cases (e.g., wrong audience)', async () => {
    const seed = await seedServiceClient({
      clientId: 'pipeline-b',
    });
    const token = await seed.signToken({ aud: 'rogue-audience' });
    const { payload } = await jwtVerify(token, seed.jwks, {
      issuer: 'http://hydra.example',
    });
    expect(payload.aud).toBe('rogue-audience');
  });
});
