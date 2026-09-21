import { vi } from 'vitest';
import { createGraphqlContextFactory } from './context.factory';

describe('createGraphqlContextFactory', () => {
  const runUpgradeSessionMiddleware = vi.fn().mockResolvedValue(undefined);
  const factory = createGraphqlContextFactory({ runUpgradeSessionMiddleware });

  beforeEach(() => {
    runUpgradeSessionMiddleware.mockClear();
  });

  it('passes the HTTP request through untouched', async () => {
    const req = { headers: { cookie: 'alkemio_session=x' } };
    const context = await factory({ req } as any);
    expect(context.req).toBe(req);
    expect(runUpgradeSessionMiddleware).not.toHaveBeenCalled();
  });

  it('builds a WebSocket request from the upgrade headers only', async () => {
    const upgrade = {
      headers: { cookie: 'alkemio_session=x' },
    };
    const context = await factory({
      extra: { request: upgrade, socket: {} },
      connectionParams: {
        headers: { authorization: 'Bearer smuggled' },
      },
    } as any);

    expect(runUpgradeSessionMiddleware).toHaveBeenCalledWith(upgrade);
    expect(context.req.headers).toEqual({ cookie: 'alkemio_session=x' });
    expect(context.req.messagingTransport).toBeUndefined();
  });

  it('stamps the advisory matrix transport flag from connectionParams.messagingTransport only', async () => {
    const context = await factory({
      extra: { request: { headers: {} }, socket: {} },
      connectionParams: { messagingTransport: 'matrix' },
    } as any);
    expect(context.req.messagingTransport).toBe('matrix');

    const other = await factory({
      extra: { request: { headers: {} }, socket: {} },
      connectionParams: { messagingTransport: 'graphql', transport: 'matrix' },
    } as any);
    expect(other.req.messagingTransport).toBeUndefined();
  });
});
