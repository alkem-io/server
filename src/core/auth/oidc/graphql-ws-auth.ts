// FR-023 (WS addendum) — auth on subscription connections is resolved at the
// HTTP upgrade ONLY. The graphql-ws `connection_init` payload (a.k.a.
// `connectionParams` on the server) MUST NOT be consulted for credentials.
// Older Alkemio code merged `connectionParams.headers` into the request
// headers — that opened a side channel where a client could present a Bearer
// token after the upgrade had completed unauthenticated. This helper builds
// the GraphQL context with the upgrade-time headers ONLY.

import type { IncomingHttpHeaders, IncomingMessage } from 'http';

export type GraphqlWsExtraRequest = IncomingMessage & {
  headers: IncomingHttpHeaders;
};

export type GraphqlWsExtra = {
  request: GraphqlWsExtraRequest;
};

export type GraphqlWsConnectionContext = {
  extra: GraphqlWsExtra;
  connectionParams?: Record<string, unknown>;
};

export type GraphqlWsRequestShape = {
  headers: IncomingHttpHeaders;
  connectionParams?: Record<string, unknown>;
};

export function buildGraphqlWsRequest(
  ctx: GraphqlWsConnectionContext
): GraphqlWsRequestShape {
  // Spread upgrade headers; deliberately DO NOT merge connectionParams.headers.
  // connectionParams is preserved on the request object for non-auth telemetry
  // (e.g. apollo-link-context "operation name" hints) but the auth strategies
  // never look at it.
  return {
    ...ctx.extra.request,
    headers: { ...ctx.extra.request.headers },
    connectionParams: ctx.connectionParams,
  } as GraphqlWsRequestShape;
}
