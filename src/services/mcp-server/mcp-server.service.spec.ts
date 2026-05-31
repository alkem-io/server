import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { McpServerService } from './mcp-server.service';

/**
 * Guards the resource-read authorization gate (R1): the MCP resource surface
 * must enforce the entity's read policy before returning content, not just the
 * API-key scope.
 */
describe('McpServerService.readResource — authorization', () => {
  const uri = 'alkemio://whiteboards/wb-1';
  const policy = { id: 'auth-policy-1' };

  const setup = (opts: { noProvider?: boolean; granted?: boolean } = {}) => {
    const provider = {
      getResourceDefinitions: () => [],
      matches: () => true,
      getAuthorizationPolicy: vi.fn().mockResolvedValue(policy),
      read: vi.fn().mockResolvedValue({
        contents: [{ uri, mimeType: 'application/json', text: '{"ok":true}' }],
      }),
    };
    const resourceRegistry = {
      getProvider: vi
        .fn()
        .mockReturnValue(opts.noProvider ? undefined : provider),
    };
    const authorizationService = {
      isAccessGranted: vi.fn().mockReturnValue(opts.granted ?? true),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const service = new McpServerService(
      {} as any,
      {} as any,
      resourceRegistry as any,
      authorizationService as any,
      logger as any
    );
    return { service, provider, authorizationService, logger };
  };

  it('throws "Resource not found" when no provider matches the URI', async () => {
    const { service } = setup({ noProvider: true });
    await expect(service.readResource(uri, new ActorContext())).rejects.toThrow(
      /Resource not found/
    );
  });

  it('denies the read when READ access is not granted, and never calls read()', async () => {
    const { service, provider, logger } = setup({ granted: false });
    const actor = new ActorContext();
    await expect(service.readResource(uri, actor)).rejects.toThrow(
      /Access denied/
    );
    expect(provider.read).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('checks READ on the provider policy and returns content when granted', async () => {
    const { service, provider, authorizationService } = setup({
      granted: true,
    });
    const actor = new ActorContext();
    const result = await service.readResource(uri, actor);
    expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
      actor,
      policy,
      AuthorizationPrivilege.READ
    );
    expect(provider.read).toHaveBeenCalledWith(uri, actor);
    expect(result.contents[0].text).toBe('{"ok":true}');
  });
});
