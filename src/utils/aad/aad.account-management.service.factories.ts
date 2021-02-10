import { AadAuthenticationClient, AuthConfig } from '@cmdbg/tokenator';
import { AadOboStrategy } from './aad.obo.strategy';
import { MsGraphService } from './ms-graph.service';

export function aadAuthClientFactory(
  authConfig: AuthConfig
): AadAuthenticationClient {
  return new AadAuthenticationClient(() => authConfig);
}

export function graphServiceFactory(
  aadOboStrategy: AadOboStrategy
): MsGraphService {
  return new MsGraphService(aadOboStrategy);
}

export function aadOboStrategyFactory(
  authClient: AadAuthenticationClient,
  req: any
): AadOboStrategy {
  const headers = req.headers;
  console.log(headers);
  return new AadOboStrategy(authClient, req);
}
