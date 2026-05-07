// Shared singleton handle for the cookie-parser and express-session middleware
// instances. main.ts builds them once and registers them on the Express app;
// the GraphQL websocket context callback retrieves the same instances to run
// them against the upgrade IncomingMessage so `req.sessionID` and `req.cookies`
// populate before CookieSessionStrategy.validate() runs (FR-023, WS addendum).

import type { RequestHandler } from 'express';

let cookieMiddleware: RequestHandler | null = null;
let sessionMiddleware: RequestHandler | null = null;

export const setSessionMiddlewares = (
  cookie: RequestHandler,
  session: RequestHandler
): void => {
  cookieMiddleware = cookie;
  sessionMiddleware = session;
};

export const getCookieMiddleware = (): RequestHandler | null =>
  cookieMiddleware;

export const getSessionMiddleware = (): RequestHandler | null =>
  sessionMiddleware;
