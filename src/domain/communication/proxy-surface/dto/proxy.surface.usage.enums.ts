import { registerEnumType } from '@nestjs/graphql';

/** GraphQL projection of the classification dispositions. */
export enum ProxySurfaceDispositionGql {
  RETAINED_CONTROL_PLANE = 'RETAINED_CONTROL_PLANE',
  RETAINED_BACKEND_INTEGRATION = 'RETAINED_BACKEND_INTEGRATION',
  MIGRATED_BROWSER_DATA_PLANE = 'MIGRATED_BROWSER_DATA_PLANE',
  LATER_MATRIX_ROOM_SCOPE = 'LATER_MATRIX_ROOM_SCOPE',
  RETAINED_MEDIA_SEAM = 'RETAINED_MEDIA_SEAM',
}

registerEnumType(ProxySurfaceDispositionGql, {
  name: 'ProxySurfaceDisposition',
  description:
    'Where a message-related API surface ends up as browsers read the messaging backend directly.',
});

/** GraphQL projection of the caller classes. */
export enum ProxyCallerClassGql {
  WEB_MATRIX = 'WEB_MATRIX',
  WEB_GRAPHQL = 'WEB_GRAPHQL',
  API = 'API',
  SERVICE = 'SERVICE',
  MCP = 'MCP',
  ANONYMOUS = 'ANONYMOUS',
}

registerEnumType(ProxyCallerClassGql, {
  name: 'ProxyCallerClass',
  description:
    'How the caller of a proxy surface was admitted: web (declaring direct backend transport or not), API bearer, service login, MCP key, or anonymous.',
});
