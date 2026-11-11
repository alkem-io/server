import { NonInteractiveLoginStrategy } from '@core/auth/non-interactive-login/non-interactive-login.strategy';
import { CookieSessionStrategy } from '@core/auth/oidc/strategies/cookie-session.strategy';
import { HydraBearerStrategy } from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import { McpApiKeyStrategy } from '@services/mcp-server/auth/mcp-api-key.strategy';
import { McpDelegationStrategy } from '@services/mcp-server/auth/mcp-delegation.strategy';
import { describe, expect, it } from 'vitest';
import { SecondFactorPolicyService } from './second-factor.policy.service';

const dependsOnPolicy = (
  strategy: abstract new (...args: never[]) => unknown
) =>
  (
    (Reflect.getMetadata('design:paramtypes', strategy) ?? []) as unknown[]
  ).includes(SecondFactorPolicyService);

// A credential that is not a person's sign-in carries no stamp and is never
// evaluated: only the two sign-in strategies can reach the evaluator.
describe('which strategies a second-factor rule reaches', () => {
  it.each([
    ['the BFF cookie session', CookieSessionStrategy],
    ['the Hydra bearer', HydraBearerStrategy],
  ])('%s strategy depends on the evaluator', (_label, strategy) => {
    expect(dependsOnPolicy(strategy)).toBe(true);
  });

  it.each([
    ['the non-interactive login', NonInteractiveLoginStrategy],
    ['the MCP API key', McpApiKeyStrategy],
    ['the MCP delegation', McpDelegationStrategy],
  ])('%s strategy cannot call the evaluator', (_label, strategy) => {
    expect(dependsOnPolicy(strategy)).toBe(false);
  });
});
