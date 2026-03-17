import { Session } from '@ory/kratos-client';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';

describe('verifyIdentityIfOidcAuth', () => {
  const createBaseIdentity = () =>
    ({
      id: 'test-id',
      schema_id: 'default',
      schema_url: 'http://test.com/schema',
      traits: { email: 'test@example.com' },
      verifiable_addresses: [
        {
          id: 'addr-1',
          value: 'test@example.com',
          verified: false,
          via: 'email' as const,
          status: 'completed' as const,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
    }) as Session['identity'];

  it('should set verified to true for OIDC auth method', () => {
    const session: Session = {
      id: 'session-1',
      identity: createBaseIdentity(),
      authentication_methods: [{ method: 'oidc' }],
    };

    const result = verifyIdentityIfOidcAuth(session);

    expect((result.identity as any).verifiable_addresses[0].verified).toBe(
      true
    );
    expect(
      (result.identity as any).verifiable_addresses[0].verified_at
    ).toBeDefined();
  });

  it('should not modify session for non-OIDC auth method', () => {
    const session: Session = {
      id: 'session-1',
      identity: createBaseIdentity(),
      authentication_methods: [{ method: 'password' }],
    };

    const result = verifyIdentityIfOidcAuth(session);

    expect((result.identity as any).verifiable_addresses[0].verified).toBe(
      false
    );
  });

  it('should not modify session when no authentication methods', () => {
    const session: Session = {
      id: 'session-1',
      identity: createBaseIdentity(),
    };

    const result = verifyIdentityIfOidcAuth(session);

    expect((result.identity as any).verifiable_addresses[0].verified).toBe(
      false
    );
  });

  it('should not modify session when verifiable_addresses is empty', () => {
    const identity = createBaseIdentity() as any;
    identity.verifiable_addresses = [];
    const session: Session = {
      id: 'session-1',
      identity,
      authentication_methods: [{ method: 'oidc' }],
    };

    const result = verifyIdentityIfOidcAuth(session);

    expect((result.identity as any).verifiable_addresses).toHaveLength(0);
  });

  it('should return the same session object', () => {
    const session: Session = {
      id: 'session-1',
      identity: createBaseIdentity(),
      authentication_methods: [{ method: 'oidc' }],
    };

    const result = verifyIdentityIfOidcAuth(session);

    expect(result).toBe(session);
  });
});
