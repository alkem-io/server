import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import type { Identity } from '@ory/kratos-client';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { describe, expect, it, vi } from 'vitest';
import { SecondFactorWaysService } from './second-factor.ways.service';

// Shapes as Kratos returns them: a credential type left out of
// `include_credential` is listed with an empty configuration.
const totp = { type: 'totp', identifiers: ['id-1'], config: {} };
const lookupSecret = {
  type: 'lookup_secret',
  identifiers: ['id-1'],
  config: {},
};
const passkey = { type: 'passkey', identifiers: ['id-1'], config: {} };
const securityKey = (isPasswordless: boolean) => ({
  id: 'a2V5',
  public_key: 'cHVibGlj',
  attestation_type: 'none',
  display_name: 'Key',
  added_at: '2026-11-01T10:00:00Z',
  is_passwordless: isPasswordless,
});
const webauthn = (...keys: ReturnType<typeof securityKey>[]) => ({
  type: 'webauthn',
  identifiers: ['id-1'],
  config: { credentials: keys, user_handle: 'aGFuZGxl' },
});

function build(identity: Partial<Identity> | undefined) {
  const getIdentityById = vi.fn().mockResolvedValue(identity);
  const service = new SecondFactorWaysService({
    getIdentityById,
  } as unknown as KratosService);
  return { service, getIdentityById };
}

const identityWith = (credentials: Record<string, unknown>) =>
  ({ id: 'id-1', credentials }) as unknown as Identity;

describe('SecondFactorWaysService.count', () => {
  it.each([
    ['nothing but a password', {}, 0],
    ['an authenticator app', { totp }, 1],
    ['recovery codes', { lookup_secret: lookupSecret }, 1],
    ['one security key', { webauthn: webauthn(securityKey(false)) }, 1],
    [
      'two security keys',
      { webauthn: webauthn(securityKey(false), securityKey(false)) },
      2,
    ],
    ['an app and recovery codes', { totp, lookup_secret: lookupSecret }, 2],
    ['an app and a key', { totp, webauthn: webauthn(securityKey(false)) }, 2],
    [
      'a key and recovery codes',
      { lookup_secret: lookupSecret, webauthn: webauthn(securityKey(false)) },
      2,
    ],
    [
      'an app, two keys and recovery codes',
      {
        totp,
        lookup_secret: lookupSecret,
        webauthn: webauthn(securityKey(false), securityKey(false)),
      },
      4,
    ],
    ['a WebAuthn credential holding no keys', { webauthn: webauthn() }, 0],
  ])('counts %s', async (_label, credentials, expected) => {
    const { service } = build(identityWith({ password: {}, ...credentials }));

    await expect(service.count('id-1')).resolves.toBe(expected);
  });

  it('does not count a passkey', async () => {
    const { service } = build(identityWith({ totp, passkey }));

    await expect(service.count('id-1')).resolves.toBe(1);
  });

  it('does not count a WebAuthn key registered as passwordless', async () => {
    const { service } = build(
      identityWith({
        totp,
        webauthn: webauthn(securityKey(true), securityKey(false)),
      })
    );

    await expect(service.count('id-1')).resolves.toBe(2);
  });

  it('counts zero for an identity without credentials', async () => {
    const { service } = build({ id: 'id-1' });

    await expect(service.count('id-1')).resolves.toBe(0);
  });

  it('requests the WebAuthn configuration only, never the TOTP or recovery-code one', async () => {
    const { service, getIdentityById } = build(identityWith({}));

    await service.count('id-1');

    expect(getIdentityById).toHaveBeenCalledTimes(1);
    expect(getIdentityById).toHaveBeenCalledWith('id-1', ['webauthn'], {
      timeoutMs: 5000,
    });
  });

  it('throws when the identity is not found', async () => {
    const { service } = build(undefined);

    await expect(service.count('id-1')).rejects.toBeInstanceOf(
      UserIdentityNotFoundException
    );
  });

  it('throws the read error when the read fails', async () => {
    const failure = new Error('connect ECONNREFUSED');
    const getIdentityById = vi.fn().mockRejectedValue(failure);
    const service = new SecondFactorWaysService({
      getIdentityById,
    } as unknown as KratosService);

    await expect(service.count('id-1')).rejects.toBe(failure);
  });
});
