import type { IncomingMessage } from 'http';

/**
 * How a request was admitted. Recorded once per request by the strategy that
 * returned an actor context (or by the interceptor / MCP guard when none did)
 * and read by telemetry that classifies callers. Never consulted for
 * authorization.
 */
export type AuthenticationMethod =
  | 'cookie-session'
  | 'non-interactive'
  | 'hydra-bearer'
  | 'mcp-api-key'
  | 'none';

export const AUTHENTICATION_METHOD_REQUEST_KEY = 'authenticationMethod';

export type RequestWithAuthenticationMethod = {
  authenticationMethod?: AuthenticationMethod;
};

export const recordAuthenticationMethod = (
  req: unknown,
  method: AuthenticationMethod
): void => {
  if (!req || typeof req !== 'object') return;
  (req as RequestWithAuthenticationMethod).authenticationMethod = method;
};

/** Absent means the request was never admitted by a credential. */
export const getAuthenticationMethod = (req: unknown): AuthenticationMethod => {
  const method = (req as RequestWithAuthenticationMethod | undefined)
    ?.authenticationMethod;
  return method ?? 'none';
};

/**
 * Whether a request (HTTP header or subscription connection parameter, both
 * advisory) declared that the browser reads Matrix directly. Read only after
 * the authentication method is known; never influences authorization.
 */
export const MESSAGING_TRANSPORT_HEADER = 'x-alkemio-messaging-transport';
export const MESSAGING_TRANSPORT_MATRIX = 'matrix';

export type RequestWithMessagingTransport = IncomingMessage & {
  messagingTransport?: typeof MESSAGING_TRANSPORT_MATRIX;
};

export const hasMatrixTransportDeclaration = (req: unknown): boolean => {
  if (!req || typeof req !== 'object') return false;
  const request = req as Partial<RequestWithMessagingTransport>;
  if (request.messagingTransport === MESSAGING_TRANSPORT_MATRIX) return true;
  const header = request.headers?.[MESSAGING_TRANSPORT_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return (
    typeof value === 'string' &&
    value.trim().toLowerCase() === MESSAGING_TRANSPORT_MATRIX
  );
};
