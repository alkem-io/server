import { ActorContext } from '@core/actor-context/actor.context';
import { CloseCode } from 'graphql-ws';
import type { IncomingMessage } from 'http';
import { resolveCookieSessionId } from './session-id.resolver';
import {
  CookieSessionInvalidError,
  SecondFactorRequiredError,
} from './strategies/auth.errors';

/**
 * A fault while re-validating (a store or rule read that failed). Unlike 4401,
 * which is final for the client, this is a code it reconnects after.
 */
export const GRAPHQL_WS_TRY_AGAIN_LATER = 1013;

type SocketRequest = IncomingMessage & {
  user?: ActorContext;
  sessionID?: unknown;
  cookies?: Record<string, unknown>;
};

export type GraphqlWsOnNextInput<T> = {
  context: { req?: SocketRequest };
  socket: { close(code: number, reason: string): void };
  result: T;
  /** Re-runs the sign-in strategies against the socket's upgrade request. */
  authenticate: (req: IncomingMessage) => Promise<ActorContext | undefined>;
  cookieName: string;
};

/**
 * Decides whether an event may be delivered on an established subscription.
 * A socket that presented the session cookie is re-validated before every
 * event: it is delivered only while the session still resolves to the actor
 * the socket was opened as, and nothing is delivered on a failed read.
 * Returns the event, or `undefined` after closing the socket.
 */
export async function graphqlWsOnNext<T>({
  context,
  socket,
  result,
  authenticate,
  cookieName,
}: GraphqlWsOnNextInput<T>): Promise<T | undefined> {
  const req = context.req;
  const openedAs = req?.user;
  // The BFF session's absolute ceiling, not the self-renewing access-token
  // expiry nor the sliding idle window.
  if (openedAs?.absoluteExpiry && openedAs.absoluteExpiry < Date.now()) {
    socket.close(CloseCode.Unauthorized, 'Session expired');
    return undefined;
  }
  // A bearer-authenticated socket is not re-validated.
  if (!req || resolveCookieSessionId(req, cookieName) === null) {
    return result;
  }

  let current: ActorContext | undefined;
  try {
    current = await authenticate(req);
  } catch (error) {
    if (error instanceof CookieSessionInvalidError) {
      socket.close(CloseCode.Unauthorized, 'Session ended');
    } else if (error instanceof SecondFactorRequiredError) {
      socket.close(CloseCode.Forbidden, 'Second factor required');
    } else {
      socket.close(GRAPHQL_WS_TRY_AGAIN_LATER, 'Try again later');
    }
    return undefined;
  }

  const openedSignedIn = openedAs && !openedAs.isAnonymous && openedAs.actorID;
  if (
    openedSignedIn &&
    (!current || current.isAnonymous || current.actorID !== openedAs.actorID)
  ) {
    socket.close(CloseCode.Unauthorized, 'Session ended');
    return undefined;
  }
  return result;
}
