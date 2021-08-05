import { GqlModuleOptions } from '@nestjs/graphql';
import { decode } from 'jsonwebtoken';

type Subscriptions = Exclude<
  GqlModuleOptions['subscriptions'],
  string | false | undefined
>;
type OnConnect = Exclude<Subscriptions['onConnect'], undefined>;
type Context = Parameters<OnConnect>[2];

// type JwtPayload = Exclude<ReturnType<typeof decode>, string | null>;

export function extractEmailSubscriptionContext(
  context: Context
): string | undefined {
  const authHeaders = context.request.headers.authorization;
  return extractEmailFromBearerToken(authHeaders);
}

export function extractEmailFromBearerToken(
  bearerToken: string | undefined
): string | undefined {
  if (bearerToken?.startsWith('Bearer ')) {
    const token = bearerToken.substring(7, bearerToken.length);
    const payload = decode(token) as any;

    return payload?.session?.identity?.traits?.email;
  }
}

export function extractWebSocketKey(context: Context): string | undefined {
  const session = context.request.headers['sec-websocket-key'];
  return Array.isArray(session) ? session[0] : session;
}
