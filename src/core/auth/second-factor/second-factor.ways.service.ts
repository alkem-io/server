import { LogContext } from '@common/enums';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { Injectable } from '@nestjs/common';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';

/** Both sign-in handlers wait on this read; past it, they fail as on any read error. */
const KRATOS_TIMEOUT_MS = 5000;

/**
 * Counts the ways an identity holds to pass the second step of a sign-in:
 * an authenticator app counts once, each security key once, recovery codes
 * once. A passkey is a first factor and never counts: neither the separate
 * `passkey` credential type nor a WebAuthn key registered as passwordless.
 */
@Injectable()
export class SecondFactorWaysService {
  constructor(private readonly kratosService: KratosService) {}

  /**
   * One identity read. Only the WebAuthn configuration is requested, for its
   * per-key list of public keys; the authenticator secret and the recovery
   * codes are never asked for. A credential type left out of `include_credential`
   * is still listed when the identity holds it, with an empty configuration,
   * so its presence is enough. A missing identity, a failed read, or one that
   * takes longer than 5 s throws.
   */
  async count(identityId: string): Promise<number> {
    const identity = await this.kratosService.getIdentityById(
      identityId,
      ['webauthn'],
      { timeoutMs: KRATOS_TIMEOUT_MS }
    );
    if (!identity) {
      throw new UserIdentityNotFoundException(
        'Identity not found while counting second-factor ways',
        LogContext.AUTH
      );
    }
    const credentials = identity.credentials ?? {};
    const securityKeys = webAuthnKeys(credentials.webauthn?.config).filter(
      key => key.is_passwordless !== true
    ).length;
    return (
      (credentials.totp ? 1 : 0) +
      securityKeys +
      (credentials.lookup_secret ? 1 : 0)
    );
  }
}

/**
 * The client types a credential's `config` as a bare `object`. A WebAuthn
 * one is `{ credentials: [{ id, public_key, is_passwordless, ... }], user_handle }`.
 */
function webAuthnKeys(config: unknown): { is_passwordless?: unknown }[] {
  const keys = (config as { credentials?: unknown } | undefined)?.credentials;
  return Array.isArray(keys) ? keys : [];
}
