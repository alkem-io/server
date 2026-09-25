import {
  MESSAGING_TRANSPORT_MATRIX,
  RequestWithMessagingTransport,
} from '@core/auth/authentication.method';
import {
  buildGraphqlWsRequest,
  GraphqlWsConnectionContext,
} from '@core/auth/oidc/graphql-ws-auth';
import type {
  ConnectionContext,
  HttpContext,
  WebsocketContext,
} from '@src/types/graphql/subscriptions/subscriptionRelatedTypes';
import type { IncomingHttpHeaders } from 'http';

export const isWebsocketContext = (
  context: unknown
): context is WebsocketContext => !!(context as WebsocketContext)?.extra;

export type GraphqlContextFactoryDeps = {
  /**
   * Replays cookie-parser + express-session against the upgrade request so
   * the cookie-session strategy sees the same `req` shape it sees on HTTP.
   */
  runUpgradeSessionMiddleware: (req: unknown) => Promise<void>;
};

/**
 * Builds the GraphQL request context for both transports.
 *
 * Authentication material comes from the HTTP request, or from the WebSocket
 * upgrade request only — `connectionParams.headers` is never merged, so a
 * client cannot present a credential after the upgrade completed. The single
 * `connectionParams` key read here is `messagingTransport`, an advisory label
 * for usage telemetry that never influences authorization.
 */
export type GraphqlContextRequest = RequestWithMessagingTransport & {
  headers: IncomingHttpHeaders;
};

export const createGraphqlContextFactory =
  (deps: GraphqlContextFactoryDeps) =>
  async (
    ctx: ConnectionContext | GraphqlWsConnectionContext
  ): Promise<{ req: GraphqlContextRequest }> => {
    if (isWebsocketContext(ctx)) {
      await deps.runUpgradeSessionMiddleware(ctx.extra.request);
      const req = buildGraphqlWsRequest(
        ctx as unknown as GraphqlWsConnectionContext
      ) as unknown as GraphqlContextRequest;
      const declared = (ctx as unknown as GraphqlWsConnectionContext)
        .connectionParams?.messagingTransport;
      if (declared === MESSAGING_TRANSPORT_MATRIX) {
        req.messagingTransport = MESSAGING_TRANSPORT_MATRIX;
      }
      return { req };
    }

    return { req: (ctx as HttpContext).req as GraphqlContextRequest };
  };
