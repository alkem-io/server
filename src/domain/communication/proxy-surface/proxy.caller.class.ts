import {
  getAuthenticationMethod,
  hasMatrixTransportDeclaration,
} from '@core/auth/authentication.method';

/**
 * Who made a proxy call, derived from the authentication method the request
 * was admitted with. Only a cookie session is refined by the advisory
 * transport declaration, so a non-web caller can never be labelled web.
 */
export type ProxyCallerClass =
  | 'WEB_MATRIX'
  | 'WEB_GRAPHQL'
  | 'API'
  | 'SERVICE'
  | 'MCP'
  | 'ANONYMOUS';

export const deriveCallerClass = (req: unknown): ProxyCallerClass => {
  switch (getAuthenticationMethod(req)) {
    case 'mcp-api-key':
      return 'MCP';
    case 'hydra-bearer':
      return 'API';
    case 'non-interactive':
      return 'SERVICE';
    case 'cookie-session':
      return hasMatrixTransportDeclaration(req) ? 'WEB_MATRIX' : 'WEB_GRAPHQL';
    default:
      return 'ANONYMOUS';
  }
};
