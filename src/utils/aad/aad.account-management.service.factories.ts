import { AadAuthenticationClient, AuthConfig } from '@cmdbg/tokenator';
import { AadAccountManagementService } from './aad.account-management.service';
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
  authClient: AadAuthenticationClient
): AadOboStrategy {
  return new AadOboStrategy(authClient);
}

export function aadAccountManagementServiceFactory(
  graphService: MsGraphService
): AadAccountManagementService {
  return new AadAccountManagementService(graphService);
}
