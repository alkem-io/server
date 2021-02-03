import { AadAuthenticationClient, AuthConfig } from '@cmdbg/tokenator';

export function createIdentityService(
  authConfig: AuthConfig
): AadAuthenticationClient {
  return new AadAuthenticationClient(() => authConfig);
}
