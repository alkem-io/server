import {
  getAuthenticationMethod,
  hasMatrixTransportDeclaration,
  recordAuthenticationMethod,
} from './authentication.method';

describe('authentication method recording', () => {
  it('reads none when nothing was recorded', () => {
    expect(getAuthenticationMethod({})).toBe('none');
    expect(getAuthenticationMethod(undefined)).toBe('none');
  });

  it('round-trips the recorded method', () => {
    const req: Record<string, unknown> = {};
    recordAuthenticationMethod(req, 'hydra-bearer');
    expect(getAuthenticationMethod(req)).toBe('hydra-bearer');
  });

  it('ignores non-object requests without throwing', () => {
    expect(() => recordAuthenticationMethod(undefined, 'none')).not.toThrow();
  });
});

describe('advisory Matrix transport declaration', () => {
  it('is read from the HTTP header, case-insensitively', () => {
    expect(
      hasMatrixTransportDeclaration({
        headers: { 'x-alkemio-messaging-transport': 'matrix' },
      })
    ).toBe(true);
    expect(
      hasMatrixTransportDeclaration({
        headers: { 'x-alkemio-messaging-transport': ' Matrix ' },
      })
    ).toBe(true);
  });

  it('is read from the subscription connection flag stamped by the context factory', () => {
    expect(
      hasMatrixTransportDeclaration({
        headers: {},
        messagingTransport: 'matrix',
      })
    ).toBe(true);
  });

  it('is false for any other value, or when absent', () => {
    expect(
      hasMatrixTransportDeclaration({
        headers: { 'x-alkemio-messaging-transport': 'graphql' },
      })
    ).toBe(false);
    expect(hasMatrixTransportDeclaration({ headers: {} })).toBe(false);
    expect(hasMatrixTransportDeclaration(undefined)).toBe(false);
  });
});
