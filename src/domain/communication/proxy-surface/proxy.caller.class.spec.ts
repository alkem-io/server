import { deriveCallerClass } from './proxy.caller.class';

describe('deriveCallerClass', () => {
  const header = { 'x-alkemio-messaging-transport': 'matrix' };

  it.each([
    ['mcp-api-key', 'MCP'],
    ['hydra-bearer', 'API'],
    ['non-interactive', 'SERVICE'],
    ['none', 'ANONYMOUS'],
    ['cookie-session', 'WEB_GRAPHQL'],
  ])('%s → %s', (method, expected) => {
    expect(
      deriveCallerClass({ authenticationMethod: method, headers: {} })
    ).toBe(expected);
  });

  it('refines a cookie session to WEB_MATRIX on the HTTP header', () => {
    expect(
      deriveCallerClass({
        authenticationMethod: 'cookie-session',
        headers: header,
      })
    ).toBe('WEB_MATRIX');
  });

  it('refines a cookie session to WEB_MATRIX on the subscription connection flag', () => {
    expect(
      deriveCallerClass({
        authenticationMethod: 'cookie-session',
        headers: {},
        messagingTransport: 'matrix',
      })
    ).toBe('WEB_MATRIX');
  });

  it('never lets the declaration turn a non-web caller into a web class', () => {
    expect(
      deriveCallerClass({
        authenticationMethod: 'mcp-api-key',
        headers: header,
      })
    ).toBe('MCP');
    expect(
      deriveCallerClass({
        authenticationMethod: 'hydra-bearer',
        headers: header,
      })
    ).toBe('API');
    expect(
      deriveCallerClass({
        authenticationMethod: 'non-interactive',
        headers: header,
      })
    ).toBe('SERVICE');
    expect(deriveCallerClass({ headers: header })).toBe('ANONYMOUS');
  });

  it('reads a missing request as ANONYMOUS', () => {
    expect(deriveCallerClass(undefined)).toBe('ANONYMOUS');
  });
});
