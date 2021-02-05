import { AadAuthenticationClient, AuthConfig } from '@cmdbg/tokenator';
import { MsGraphService } from './ms-graph.service';

export function identityServiceFactory(
  authConfig: AuthConfig
): AadAuthenticationClient {
  return new AadAuthenticationClient(() => authConfig);
}

export function graphServiceFactory(): MsGraphService {
  return new MsGraphService();
}
