import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OidcService } from './oidc.service';

// Control issuer discovery by mocking openid-client's static `Issuer.discover`.
const { discoverMock } = vi.hoisted(() => ({ discoverMock: vi.fn() }));
vi.mock('openid-client', () => ({
  Issuer: { discover: discoverMock },
}));

const OIDC_CONFIG = {
  issuer_url: 'https://identity.test-alkem.io/',
  web_client_id: 'alkemio-web',
  web_redirect_uri: 'https://test-alkem.io/auth/callback',
};

const makeService = (): OidcService => {
  const configService = { get: vi.fn().mockReturnValue(OIDC_CONFIG) } as any;
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
  return new OidcService(configService, logger);
};

// A discovered issuer exposes a `Client` constructor; the service does
// `new issuer.Client(opts)`. Use a real class (records its construction opts) so
// the resolved client is a genuine instance.
const makeFakeIssuer = () => {
  const constructedWith: unknown[] = [];
  class FakeClient {
    constructor(opts: unknown) {
      constructedWith.push(opts);
    }
  }
  return {
    metadata: { issuer: OIDC_CONFIG.issuer_url },
    Client: FakeClient,
    constructedWith,
  } as any;
};

// The failure the live crash was caused by (openid-client RPError).
const DISCOVERY_ERROR = new Error('outgoing request timed out after 3500ms');

// Deterministically settle the fire-and-forget discovery.
//
// The prior helper raced: it polled getClient() while advancing fake time in
// fixed 1s steps, so whether the client was ready by a given step depended on how
// many microtask turns the discovery promise chain happened to get — flaky under
// parallel load.
//
// Instead: `advanceTimersByTimeAsync(0)` flushes the discovery promise chain at
// t=0 (covers the immediate-success path, which schedules no backoff timer), then
// `runAllTimersAsync` fires every pending/newly-scheduled backoff timer, flushing
// microtasks between them, until the queue drains (the success path stops
// scheduling once the client resolves). No polling, no race window.
const settleDiscovery = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
  await vi.runAllTimersAsync();
};

describe('OidcService — boot resilience', () => {
  beforeEach(() => {
    discoverMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Leave the never-resolving background retry parked on a cleared fake timer.
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not throw on boot when issuer discovery fails, and reports not-ready', async () => {
    discoverMock.mockRejectedValue(DISCOVERY_ERROR);
    const service = makeService();

    // onModuleInit is fire-and-forget: it must return synchronously without
    // throwing (a boot-fatal discovery previously crashed the whole process).
    expect(() => service.onModuleInit()).not.toThrow();

    // Let the first (failing) discovery attempt settle.
    await vi.advanceTimersByTimeAsync(0);

    // The server is up; interactive-login accessors surface a clear
    // "not yet initialised" error instead of exposing an undefined client.
    expect(() => service.getClient()).toThrow(/not yet initialised/);
    expect(() => service.getIssuer()).toThrow(/not yet initialised/);
    expect(discoverMock).toHaveBeenCalled();
  });

  it('self-heals: resolves the client once discovery succeeds on a later attempt', async () => {
    const fakeIssuer = makeFakeIssuer();
    discoverMock
      .mockRejectedValueOnce(DISCOVERY_ERROR) // first attempt fails
      .mockResolvedValue(fakeIssuer); // retry succeeds

    const service = makeService();
    service.onModuleInit();

    await settleDiscovery();
    expect(service.getClient()).toBeInstanceOf(fakeIssuer.Client);
    expect(service.getIssuer()).toBe(fakeIssuer);
    expect(fakeIssuer.constructedWith[0]).toMatchObject({
      client_id: OIDC_CONFIG.web_client_id,
    });
    expect(discoverMock).toHaveBeenCalledTimes(2);
  });

  it('discovers on the first attempt with no retry when the issuer is reachable', async () => {
    const fakeIssuer = makeFakeIssuer();
    discoverMock.mockResolvedValue(fakeIssuer);

    const service = makeService();
    service.onModuleInit();

    await settleDiscovery();
    expect(service.getClient()).toBeInstanceOf(fakeIssuer.Client);
    expect(discoverMock).toHaveBeenCalledTimes(1);
  });

  it('runs discovery only once — the guard blocks overlapping and post-success rounds', async () => {
    const fakeIssuer = makeFakeIssuer();
    discoverMock.mockResolvedValue(fakeIssuer);
    const service = makeService();

    // Two near-simultaneous inits: the second must short-circuit on
    // `discovering` while the first round is still in flight.
    service.onModuleInit();
    service.onModuleInit();
    await settleDiscovery();
    // The first round resolved the client (so the second init above was a no-op).
    expect(service.getClient()).toBeInstanceOf(fakeIssuer.Client);

    // A later init, after discovery has completed, must short-circuit on
    // `this.client`.
    service.onModuleInit();
    await settleDiscovery();

    expect(discoverMock).toHaveBeenCalledTimes(1);
  });
});
