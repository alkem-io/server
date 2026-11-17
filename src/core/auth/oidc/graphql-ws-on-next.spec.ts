import { ActorContext } from '@core/actor-context/actor.context';
import { CloseCode } from 'graphql-ws';
import { describe, expect, it, vi } from 'vitest';
import {
  GRAPHQL_WS_TRY_AGAIN_LATER,
  graphqlWsOnNext,
} from './graphql-ws-on-next';
import {
  CookieSessionInvalidError,
  SecondFactorRequiredError,
} from './strategies/auth.errors';
import { SessionStoreUnavailableError } from './strategies/cookie-session.errors';

const COOKIE_NAME = 'alkemio_session';
const RESULT = { data: { messageReceived: { id: 'm-1' } } };

const signedIn = (actorID = 'actor-1', extra: Partial<ActorContext> = {}) =>
  Object.assign(new ActorContext(), { actorID, isAnonymous: false, ...extra });
const anonymous = () =>
  Object.assign(new ActorContext(), { actorID: '', isAnonymous: true });

function cookieRequest(user: ActorContext | undefined) {
  return {
    sessionID: 'sid-1',
    cookies: { [COOKIE_NAME]: 's:sid-1.signature' },
    headers: {},
    user,
  };
}

async function run(opts: {
  req: Record<string, unknown>;
  authenticate?: () => Promise<ActorContext | undefined>;
  assertNotRefused?: (actor: ActorContext) => Promise<void>;
}) {
  const socket = { close: vi.fn() };
  const authenticate = vi.fn(opts.authenticate ?? (async () => undefined));
  const assertNotRefused = vi.fn(opts.assertNotRefused ?? (async () => {}));
  const out = await graphqlWsOnNext({
    context: { req: opts.req as never },
    socket,
    result: RESULT,
    authenticate,
    assertNotRefused,
    cookieName: COOKIE_NAME,
  });
  return { out, socket, authenticate, assertNotRefused };
}

describe('graphqlWsOnNext — a cookie socket is re-validated before each event', () => {
  it('delivers the event while the session still resolves to the same actor', async () => {
    const { out, socket } = await run({
      req: cookieRequest(signedIn()),
      authenticate: async () => signedIn(),
    });

    expect(out).toBe(RESULT);
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('closes 4401 and delivers nothing when the session was revoked', async () => {
    const { out, socket } = await run({
      req: cookieRequest(signedIn()),
      authenticate: () =>
        Promise.reject(new CookieSessionInvalidError('subject_revoked')),
    });

    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(
      CloseCode.Unauthorized,
      expect.any(String)
    );
  });

  it('closes 4403 and delivers nothing when the sign-in is refused', async () => {
    const { out, socket } = await run({
      req: cookieRequest(signedIn()),
      authenticate: () => Promise.reject(new SecondFactorRequiredError()),
    });

    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(
      CloseCode.Forbidden,
      'Second factor required'
    );
  });

  it.each([
    ['a failed rule read', new Error('connection terminated')],
    [
      'an unreachable session store',
      new SessionStoreUnavailableError(new Error('down')),
    ],
  ])('closes 1013 and delivers nothing on %s', async (_label, failure) => {
    const { out, socket } = await run({
      req: cookieRequest(signedIn()),
      authenticate: () => Promise.reject(failure),
    });

    expect(GRAPHQL_WS_TRY_AGAIN_LATER).toBe(1013);
    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(1013, 'Try again later');
  });

  it.each([
    ['resolves to nobody (signed out, record gone)', async () => undefined],
    ['resolves to an anonymous actor', async () => anonymous()],
    ['resolves to another actor', async () => signedIn('actor-2')],
  ])('closes 4401 on a signed-in socket whose session %s', async (_label, authenticate) => {
    const { out, socket } = await run({
      req: cookieRequest(signedIn('actor-1')),
      authenticate,
    });

    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(
      CloseCode.Unauthorized,
      expect.any(String)
    );
  });

  it('delivers to a socket opened anonymous whose session resolves to nobody', async () => {
    const { out, socket } = await run({
      req: cookieRequest(anonymous()),
      authenticate: async () => undefined,
    });

    expect(out).toBe(RESULT);
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('does not re-validate a socket that presented no session cookie (bearer upgrade)', async () => {
    const { out, authenticate } = await run({
      req: {
        headers: { authorization: 'Bearer x' },
        user: signedIn(),
      },
    });

    expect(out).toBe(RESULT);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('closes 4403 on a bearer socket once its actor is refused', async () => {
    const actor = signedIn();
    const { out, socket, authenticate, assertNotRefused } = await run({
      req: { headers: { authorization: 'Bearer x' }, user: actor },
      assertNotRefused: async () => {
        throw new SecondFactorRequiredError();
      },
    });

    expect(out).toBeUndefined();
    expect(assertNotRefused).toHaveBeenCalledWith(actor);
    expect(socket.close).toHaveBeenCalledWith(
      CloseCode.Forbidden,
      'Second factor required'
    );
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('closes 1013 on a bearer socket when the rule cannot be read', async () => {
    const { out, socket } = await run({
      req: { headers: { authorization: 'Bearer x' }, user: signedIn() },
      assertNotRefused: async () => {
        throw new Error('database down');
      },
    });

    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(
      GRAPHQL_WS_TRY_AGAIN_LATER,
      'Try again later'
    );
  });

  it('still closes a socket past its absolute ceiling', async () => {
    const { out, socket, authenticate } = await run({
      req: cookieRequest(
        signedIn('actor-1', { absoluteExpiry: Date.now() - 1 })
      ),
      authenticate: async () => signedIn(),
    });

    expect(out).toBeUndefined();
    expect(socket.close).toHaveBeenCalledWith(
      CloseCode.Unauthorized,
      'Session expired'
    );
    expect(authenticate).not.toHaveBeenCalled();
  });
});
