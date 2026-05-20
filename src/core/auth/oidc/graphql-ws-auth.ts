// FR-023 (WS addendum) — auth on subscription connections is resolved at the
// HTTP upgrade ONLY. The graphql-ws `connection_init` payload (a.k.a.
// `connectionParams` on the server) MUST NOT be consulted for credentials.
// Older Alkemio code merged `connectionParams.headers` into the request
// headers — that opened a side channel where a client could present a Bearer
// token after the upgrade had completed unauthenticated. This helper builds
// the GraphQL context with the upgrade-time headers ONLY.
//
// 004 T034 — extended with a `closeOnRevoke` registry. The graphql-ws
// server tracks open connections keyed by both `clientId` (for FR-018
// full-client revoke) AND bearer `jti` (for FR-011a single-bearer
// revoke). Both branches close the WebSocket with RFC 6455 code `4401`
// + reason `"token_revoked"` — identical close-frame so SDKs do not
// need to branch (per contract/graphql-ws-close-on-revoke.md).

import { Injectable } from '@nestjs/common';
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

// ---- 004 T034 — close-on-revoke registry --------------------------------

/**
 * RFC 6455 close code 4401 + reason "token_revoked" — identical on both
 * full-client and single-bearer revoke branches per
 * contracts/graphql-ws-close-on-revoke.md. Distinct from
 * `"token_expired"` (which clients SHOULD handle by silently re-minting
 * + reconnecting); 4401 signals "do not auto-reconnect without
 * re-authenticating".
 */
export const GRAPHQL_WS_TOKEN_REVOKED_CLOSE_CODE = 4401;
export const GRAPHQL_WS_TOKEN_REVOKED_CLOSE_REASON = 'token_revoked';

/**
 * Minimal abstraction over the underlying WebSocket. We accept any
 * object exposing `close(code, reason)` — the graphql-ws library passes
 * the native `ws` `WebSocket` instance, which satisfies this shape.
 */
export interface CloseableWebSocket {
  close(code: number, reason?: string): void;
}

interface RegisteredConnection {
  clientId: string;
  jti: string | null;
  socket: CloseableWebSocket;
}

/**
 * Tracks open WS connections so revoke flows can close them
 * out-of-band. The registry is per-replica; cross-replica propagation
 * for FR-018 / FR-011a piggy-backs on the
 * `alkemio:svc:cache-invalidation` Redis pub/sub (T029) — each replica
 * receives the invalidation broadcast and invokes
 * `closeAllForClient` locally.
 *
 * The registry is keyed by an opaque connection id (e.g. the
 * graphql-ws connection's UUID) so a single connection can be removed
 * on natural close without scanning every key.
 */
@Injectable()
export class GraphqlWsConnectionRegistry {
  private readonly connections = new Map<string, RegisteredConnection>();

  /**
   * Called from the graphql-ws `onConnect` hook after auth resolution.
   * `jti` is `null` for cookie-session / user-bearer subscriptions
   * that don't carry an FR-011a-revocable jti — those connections are
   * untouched by the single-bearer close path.
   */
  register(
    connectionId: string,
    clientId: string,
    jti: string | null,
    socket: CloseableWebSocket
  ): void {
    this.connections.set(connectionId, { clientId, jti, socket });
  }

  /**
   * Called from the graphql-ws `onDisconnect` / natural-close hook.
   * Best-effort: a missing entry is a no-op (idempotent so the close
   * paths don't have to coordinate with natural-close).
   */
  unregister(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * FR-018 full-client revoke. Closes every connection authenticated
   * by `clientId` with the uniform close-frame; sibling subscriptions
   * on different clients are untouched.
   *
   * Returns the count of connections closed (useful for audit /
   * metrics; close itself is fire-and-forget).
   */
  closeAllForClient(clientId: string): number {
    let count = 0;
    for (const [id, entry] of this.connections.entries()) {
      if (entry.clientId !== clientId) continue;
      this.closeConnection(id, entry);
      count += 1;
    }
    return count;
  }

  /**
   * FR-011a single-bearer revoke. Closes only the connection
   * authenticated by `jti`; sibling bearers on the same client stay
   * open. Returns the count of connections closed (0 or 1 in
   * practice; the registry could in principle hold duplicates if a
   * client opens two WS upgrades on the same bearer, in which case
   * both close).
   */
  closeForJti(jti: string): number {
    if (!jti) return 0;
    let count = 0;
    for (const [id, entry] of this.connections.entries()) {
      if (entry.jti !== jti) continue;
      this.closeConnection(id, entry);
      count += 1;
    }
    return count;
  }

  /** Test-affordance: snapshot the current registry size. */
  size(): number {
    return this.connections.size;
  }

  private closeConnection(
    connectionId: string,
    entry: RegisteredConnection
  ): void {
    try {
      entry.socket.close(
        GRAPHQL_WS_TOKEN_REVOKED_CLOSE_CODE,
        GRAPHQL_WS_TOKEN_REVOKED_CLOSE_REASON
      );
    } catch {
      // best-effort — socket may already be closed by the peer or by
      // the underlying transport. Either way we drop the entry from
      // the registry so we don't try again.
    }
    this.connections.delete(connectionId);
  }
}
