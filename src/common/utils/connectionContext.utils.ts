import { GqlModuleOptions } from '@nestjs/graphql';
import { decode } from 'jsonwebtoken';

type Subscriptions = Exclude<
  GqlModuleOptions['subscriptions'],
  string | false | undefined
>;
type OnConnect = Exclude<Subscriptions['onConnect'], undefined>;
type Context = Parameters<OnConnect>[2];

// type JwtPayload = Exclude<ReturnType<typeof decode>, string | null>;

export function isolateEmail(context: Context): string | undefined {
  const authHeaders = context.request.headers.authorization;
  if (authHeaders?.startsWith('Bearer ')) {
    const token = authHeaders.substring(7, authHeaders.length);
    const payload = decode(token) as any;

    return payload?.session?.identity?.traits?.email;
  }
}

export function isolateWebSocketKey(context: Context): string | undefined {
  const session = context.request.headers['sec-websocket-key'];
  return Array.isArray(session) ? session[0] : session;
}
