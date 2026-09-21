import { ExecutionContext } from '@nestjs/common';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import {
  authenticationMethodForMcpStrategy,
  McpAuthGuard,
} from './mcp-auth.guard';

describe('McpAuthGuard authentication method recording', () => {
  const makeContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  const makeGuard = (winner: string | undefined) => {
    const guard = new McpAuthGuard(MockWinstonProvider.useValue as any);
    const strategyFields: Record<string, string> = {
      mcpDelegationGuard: 'mcp-delegation',
      mcpApiKeyGuard: 'mcp-api-key',
      oidcCookieSessionGuard: 'oidc-cookie-session',
      nonInteractiveLoginGuard: 'non-interactive-login',
      hydraBearerGuard: 'hydra-bearer',
    };
    for (const [field, name] of Object.entries(strategyFields)) {
      (guard as any)[field] = {
        canActivate: vi.fn(async (ctx: ExecutionContext) => {
          if (name === winner) {
            ctx.switchToHttp().getRequest().user = {
              actorID: 'actor-1',
              isAnonymous: false,
            };
          }
          return name === winner;
        }),
      };
    }
    return guard;
  };

  it.each([
    ['mcp-delegation', 'mcp-api-key'],
    ['mcp-api-key', 'mcp-api-key'],
    ['oidc-cookie-session', 'cookie-session'],
    ['non-interactive-login', 'non-interactive'],
    ['hydra-bearer', 'hydra-bearer'],
  ])('records the admitting method for strategy %s as %s', async (winner, expected) => {
    const request: Record<string, unknown> = {};
    const result = await makeGuard(winner).canActivate(makeContext(request));
    expect(result).toBe(true);
    expect(request.authenticationMethod).toBe(expected);
  });

  it('records none when no strategy authenticates', async () => {
    const request: Record<string, unknown> = {};
    const result = await makeGuard(undefined).canActivate(makeContext(request));
    expect(result).toBe(true);
    expect(request.authenticationMethod).toBe('none');
    expect((request.user as any).isAnonymous).toBe(true);
  });

  it('maps every MCP strategy name to an authentication method', () => {
    expect(authenticationMethodForMcpStrategy('mcp-delegation')).toBe(
      'mcp-api-key'
    );
    expect(authenticationMethodForMcpStrategy('hydra-bearer')).toBe(
      'hydra-bearer'
    );
  });
});
