import { LogContext } from '@common/enums';
import { AuthenticationType } from '@common/enums/authentication.type';
import {
  BearerTokenNotFoundException,
  LoginFlowException,
  LoginFlowInitializeException,
} from '@common/exceptions/auth';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  FrontendApi,
  Identity,
  IdentityApi,
} from '@ory/kratos-client';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OryDefaultIdentitySchema } from './types/ory.default.identity.schema';

/**
 * The `KratosService` class provides methods to interact with the Ory Kratos identity management system:
 * identity lookup/mutation, admin session invalidation, and the admin service-account login flow.
 *
 * Request/session VALIDATION does not live here — since the OIDC BFF migration the live auth
 * paths (GraphQL AuthInterceptor strategies and the traefik forwardAuth resolver) authenticate
 * via the BFF `alkemio_session` (Redis) or Hydra bearer tokens, never the Kratos session cookie.
 *
 * @remarks
 * This service relies on the Ory Kratos Identity and Frontend APIs to perform its operations.
 * It uses the `ConfigService` to retrieve necessary configuration values for initializing the API clients.
 *
 * @public
 */
@Injectable()
export class KratosService {
  private readonly kratosPublicUrlServer: string;
  private readonly adminPasswordIdentifier: string;
  private readonly adminPassword: string;
  public readonly kratosIdentityClient: IdentityApi;
  public readonly kratosFrontEndClient: FrontendApi;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.kratosPublicUrlServer = this.configService.get(
      'identity.authentication.providers.ory.kratos_public_base_url_server',
      { infer: true }
    );
    const {
      kratos_public_base_url_server,
      kratos_admin_base_url_server,
      admin_service_account,
    } = this.configService.get('identity.authentication.providers.ory', {
      infer: true,
    });
    this.kratosPublicUrlServer = kratos_public_base_url_server;
    const kratosAdminUrlServer = kratos_admin_base_url_server;

    this.adminPasswordIdentifier = admin_service_account.username;
    this.adminPassword = admin_service_account.password;

    this.kratosIdentityClient = new IdentityApi(
      new Configuration({
        basePath: kratosAdminUrlServer,
      })
    );

    this.kratosFrontEndClient = new FrontendApi(
      new Configuration({
        basePath: this.kratosPublicUrlServer,
      })
    );
  }

  /**
   * Retrieves a bearer token by initiating and completing a login flow with the provided identifier and password.
   *
   * @returns A promise that resolves to a bearer token string.
   * @throws {LoginFlowInitializeException} If the login flow initialization fails.
   * @throws {LoginFlowException} If the login flow update fails.
   * @throws {BearerTokenNotFoundException} If the bearer token is not found after the login flow completes.
   */
  public async getBearerToken(): Promise<string> {
    const kratos = this.kratosFrontEndClient;
    const identifier = this.adminPasswordIdentifier;
    const password = this.adminPassword;

    let flowId: string;

    try {
      const flowData = await kratos.createNativeLoginFlow();
      flowId = flowData.data.id;
    } catch (e) {
      const err = e as Error;
      throw new LoginFlowInitializeException(
        `Login flow initialize for ${identifier} failed with: ${err.message}`
      );
    }

    let sessionToken: string | undefined;
    let sessionId: string | undefined;

    try {
      const sessionData = await kratos.updateLoginFlow({
        flow: flowId,
        updateLoginFlowBody: {
          method: 'password',
          identifier,
          password,
        },
      });
      sessionToken = sessionData.data.session_token;
      sessionId = sessionData.data.session.id;
    } catch (e) {
      const err = e as Error;
      throw new LoginFlowException(
        `Login flow for ${identifier} failed with: ${err.message}`
      );
    }

    if (!sessionToken) {
      throw new BearerTokenNotFoundException(
        `Bearer token not found for session ${sessionId} of ${identifier}`
      );
    }

    return sessionToken;
  }

  /**
   * Maps the provided identity to an authentication type.
   *
   * @param identity - The identity object containing credentials.
   * @returns The corresponding authentication types based on the identity's credentials.
   *
   * The function checks the following conditions:
   * - For OIDC credentials it inspects EVERY linked identifier (a single Kratos
   *   identity can have several — e.g. `['cleverbase:…', 'linkedin:…']`), mapping
   *   each provider prefix to its `AuthenticationType`:
   *   - `microsoft` -> `AuthenticationType.MICROSOFT`
   *   - `linkedin`  -> `AuthenticationType.LINKEDIN`
   *   - `github`    -> `AuthenticationType.GITHUB`
   *   - `cleverbase` -> `AuthenticationType.CLEVERBASE`
   * - If the identity has password credentials, it adds `AuthenticationType.EMAIL`.
   * - If the identity has passkey (or legacy webauthn) credentials, it adds
   *   `AuthenticationType.PASSKEY`.
   * - If none of the above conditions are met, it adds `AuthenticationType.UNKNOWN`.
   */
  public mapAuthenticationType(identity: Identity): AuthenticationType[] {
    if (!identity?.credentials) {
      return [AuthenticationType.UNKNOWN];
    }

    // Map each OIDC provider prefix to its AuthenticationType. Kratos stores the
    // identifier as `<provider>:<subject>`, and one identity can carry several.
    const oidcProviderMap: ReadonlyArray<[string, AuthenticationType]> = [
      ['microsoft', AuthenticationType.MICROSOFT],
      ['linkedin', AuthenticationType.LINKEDIN],
      ['github', AuthenticationType.GITHUB],
      ['cleverbase', AuthenticationType.CLEVERBASE],
    ];

    const authTypes = new Set<AuthenticationType>();

    const oidcIdentifiers = identity.credentials.oidc?.identifiers ?? [];
    for (const identifier of oidcIdentifiers) {
      for (const [prefix, type] of oidcProviderMap) {
        if (identifier.startsWith(prefix)) {
          authTypes.add(type);
        }
      }
    }

    if (identity.credentials.password) {
      authTypes.add(AuthenticationType.EMAIL);
    }

    // Passkeys are a separate Kratos credential type (`passkey`, with `webauthn`
    // as the legacy key) — not OIDC and not password — so they must be detected
    // explicitly or they never surface as an authentication method.
    if (identity.credentials.passkey || identity.credentials.webauthn) {
      authTypes.add(AuthenticationType.PASSKEY);
    }

    return authTypes.size ? [...authTypes] : [AuthenticationType.UNKNOWN];
  }

  /**
   * Retrieves an identity by email.
   *
   * @param email - The email address to search for the identity.
   * @returns A promise that resolves to the identity if found, or undefined if not found.
   *
   * @remarks
   * This method uses the `kratosIdentityClient` to list identities with the specified email.
   * If no identity is found, a warning is logged.
   *
   * @example
   * ```typescript
   * const identity = await getIdentityByEmail('example@example.com');
   * if (identity) {
   *   console.log('Identity found:', identity);
   * } else {
   *   console.log('Identity not found.');
   * ```
   */
  public async getIdentityByEmail(
    email: string
  ): Promise<Identity | undefined> {
    const { data: identity } = await this.kratosIdentityClient.listIdentities({
      credentialsIdentifier: email,
      includeCredential: ['password', 'oidc'],
    });
    if (!identity || identity.length === 0) {
      this.logger.warn(
        `Identity with email ${email} not found.`,
        LogContext.KRATOS
      );
      return undefined;
    }
    return identity[0];
  }

  /**
   * Case-insensitive identity lookup by email. Returns null when the email is not
   * registered on any Kratos identity. Used by the uniqueness check before
   * committing a user-email-change (research.md §R7).
   */
  public async findIdentityByEmail(email: string): Promise<Identity | null> {
    const { data: identities } = await this.kratosIdentityClient.listIdentities(
      {
        credentialsIdentifier: email,
        includeCredential: ['password', 'oidc'],
      }
    );
    if (!identities || identities.length === 0) {
      return null;
    }
    return identities[0];
  }

  /**
   * Reads the current `email` trait for an identity. Used by the drift-resolve
   * flow (research.md §R6) when reconciling the observed per-side values to a
   * canonical address.
   */
  public async getIdentityEmailTrait(
    identityId: string
  ): Promise<string | undefined> {
    const identity = await this.getIdentityById(identityId);
    if (!identity) return undefined;
    const traits = (identity.traits ?? {}) as Record<string, unknown> & {
      email?: string;
    };
    return typeof traits.email === 'string' ? traits.email : undefined;
  }

  /**
   * Replaces the `email` trait on a Kratos identity, then best-effort marks the
   * new address as verified so the user is not re-prompted on next login (FR-011).
   *
   * Kratos's `updateIdentity` admin body accepts only `schema_id` / `state` /
   * `traits` / `metadata_*` — it has NO `verifiable_addresses` field, and
   * verifiable addresses are recomputed from the traits on every update. The
   * verified flag is therefore applied as a follow-up `patchIdentity` step.
   *
   * The trait update is the load-bearing write — if it fails, the caller's
   * commit/rollback logic engages. The verified-marking step is best-effort:
   * a failure there is logged but does NOT fail the email change (it degrades
   * to "user re-verifies on next login").
   */
  public async updateIdentityEmailTrait(
    identityId: string,
    newEmail: string
  ): Promise<Identity> {
    const existing = await this.getIdentityById(identityId);
    if (!existing) {
      throw new UserIdentityNotFoundException(
        `Identity with id ${identityId} not found.`
      );
    }
    const currentTraits = (existing.traits ?? {}) as Record<string, unknown>;
    const updatedTraits = { ...currentTraits, email: newEmail };

    const { data: updated } = await this.kratosIdentityClient.updateIdentity({
      id: identityId,
      updateIdentityBody: {
        schema_id: existing.schema_id,
        state: existing.state === 'inactive' ? 'inactive' : 'active',
        traits: updatedTraits,
      },
    });

    await this.markIdentityEmailVerified(identityId, newEmail);

    return updated;
  }

  /**
   * Best-effort: marks the verifiable address matching `email` as verified via
   * `patchIdentity`. Kratos exposes no single-call admin API for this; JSON
   * Patch against the recomputed `verifiable_addresses` array is the admin path.
   * Any failure is logged and swallowed — see `updateIdentityEmailTrait`.
   */
  private async markIdentityEmailVerified(
    identityId: string,
    email: string
  ): Promise<void> {
    try {
      const identity = await this.getIdentityById(identityId);
      const addresses =
        (identity as OryDefaultIdentitySchema)?.verifiable_addresses ?? [];
      const index = addresses.findIndex(
        address => address.value?.toLowerCase() === email.toLowerCase()
      );
      if (index < 0) {
        this.logger.warn(
          `Email-change: no verifiable address found to mark verified for identity ${identityId}`,
          LogContext.KRATOS
        );
        return;
      }
      await this.kratosIdentityClient.patchIdentity({
        id: identityId,
        jsonPatch: [
          {
            op: 'replace',
            path: `/verifiable_addresses/${index}/verified`,
            value: true,
          },
          {
            op: 'replace',
            path: `/verifiable_addresses/${index}/status`,
            value: 'completed',
          },
          {
            op: 'replace',
            path: `/verifiable_addresses/${index}/verified_at`,
            value: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      this.logger.warn(
        `Email-change: could not mark new address verified for identity ${identityId}: ${(error as Error)?.message}`,
        LogContext.KRATOS
      );
    }
  }

  /**
   * Disables every active session for an identity in a single admin call
   * (research.md §R2). FR-017 / FR-017a: invoked from the post-commit chain in
   * `UserEmailChangeService.applyAdminEmailChange`.
   */
  public async invalidateAllIdentitySessions(
    identityId: string
  ): Promise<void> {
    // The @ory/kratos-client v26 admin API exposes session invalidation via
    // `deleteIdentitySessions` (revokes ALL active sessions for the identity in
    // a single call). Earlier client versions called this `disableIdentitySessions`.
    try {
      await this.kratosIdentityClient.deleteIdentitySessions({
        id: identityId,
      });
    } catch (error) {
      // Kratos returns 404 when the identity has no active sessions to revoke.
      // The post-condition "no active sessions exist" is already satisfied, so
      // this is a no-op success — not a failure.
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        this.logger.verbose?.(
          `No active Kratos sessions to invalidate for identity ${identityId}`,
          LogContext.KRATOS
        );
        return;
      }
      throw error;
    }
  }

  public async getIdentityById(
    identityId: string
  ): Promise<Identity | undefined> {
    try {
      const { data: identity } = await this.kratosIdentityClient.getIdentity({
        id: identityId,
      });
      return identity;
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        this.logger.warn(
          `Identity with id ${identityId} not found.`,
          LogContext.KRATOS
        );
        return undefined;
      }

      this.logger.error(
        `Error fetching identity with id ${identityId}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      throw error;
    }
  }

  /**
   * Deletes an identity by email.
   *
   * @param email - The email of the identity to be deleted.
   * @returns A promise that resolves to void if the identity is deleted successfully.
   * @throws UserIdentityNotFoundException if the identity with the specified email is not found.
   */
  public async deleteIdentityByEmail(email: string): Promise<void | never> {
    const identity = await this.getIdentityByEmail(email);
    if (!identity) {
      throw new UserIdentityNotFoundException(
        `Identity with email ${email} not found.`
      );
    }

    await this.kratosIdentityClient.deleteIdentity({
      id: identity.id,
    });
  }

  /**
   * Deletes an identity by ID.
   *
   * @param kratosIdentityId - The ID of the identity to be deleted.
   * @returns A promise that resolves to void if the identity is deleted successfully.
   */
  public async deleteIdentityById(kratosIdentityId: string): Promise<void> {
    await this.kratosIdentityClient.deleteIdentity({
      id: kratosIdentityId,
    });
  }

  /**
   * Clears alkemio_actor_id from a Kratos identity's metadata_public.
   * Used before identity deletion to prevent stale actor references
   * on re-registration. Uses "add" op which creates-or-replaces,
   * avoiding RFC 6902 "remove" failures on missing paths.
   */
  public async clearIdentityActorMetadata(
    kratosIdentityId: string
  ): Promise<void> {
    await this.kratosIdentityClient.patchIdentity({
      id: kratosIdentityId,
      jsonPatch: [
        {
          op: 'add',
          path: '/metadata_public',
          value: {},
        },
      ],
    });
  }

  /**
   * Retrieves all identities that have not been verified.
   *
   * @returns A promise that resolves to an array of unverified identities.
   * @remarks
   * This method fetches all identities from Kratos and filters for those
   * with verifiable addresses that have not been verified.
   */
  public async getUnverifiedIdentities(): Promise<Identity[]> {
    try {
      const { data: identities } =
        await this.kratosIdentityClient.listIdentities({
          includeCredential: ['password'],
        });

      if (!identities || identities.length === 0) {
        return [];
      }

      return identities.filter(identity => {
        const oryIdentity = identity as OryDefaultIdentitySchema;

        // Check if the identity has verifiable addresses
        if (!oryIdentity.verifiable_addresses) {
          return false;
        }

        // Return true if any verifiable address is not verified
        return oryIdentity.verifiable_addresses.some(
          address => !address.verified
        );
      });
    } catch (error) {
      this.logger.error(
        `Error fetching unverified identities: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      throw error;
    }
  }

  /**
   * Retrieves all identities from Kratos.
   *
   * @returns A promise that resolves to an array of all identities.
   */
  public async getAllIdentities(): Promise<Identity[]> {
    try {
      const { data: identities } =
        await this.kratosIdentityClient.listIdentities({
          includeCredential: ['password', 'oidc'],
        });

      return identities || [];
    } catch (error) {
      this.logger.error(
        `Error fetching all identities: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      throw error;
    }
  }

  /**
   * Retrieves all identities that have been verified.
   *
   * @returns A promise that resolves to an array of verified identities.
   */
  public async getVerifiedIdentities(): Promise<Identity[]> {
    try {
      const { data: identities } =
        await this.kratosIdentityClient.listIdentities({
          includeCredential: ['password'],
        });

      if (!identities || identities.length === 0) {
        return [];
      }

      return identities.filter(identity => {
        const oryIdentity = identity as OryDefaultIdentitySchema;

        // Check if the identity has verifiable addresses
        if (!oryIdentity.verifiable_addresses) {
          return false;
        }

        // Return true if all verifiable addresses are verified
        return oryIdentity.verifiable_addresses.every(
          address => address.verified
        );
      });
    } catch (error) {
      this.logger.error(
        `Error fetching verified identities: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      throw error;
    }
  }

  /**
   * Retrieves the date at which the account associated with a given email was last authenticated.
   *
   * @param identity - The identity to look up the authentication date for.
   * @returns A promise that resolves to the date of the last authentication.
   */
  public async getAuthenticatedAt(
    identity: Identity
  ): Promise<Date | undefined> {
    try {
      const { data: sessions } =
        await this.kratosIdentityClient.listIdentitySessions({
          id: identity.id,
          active: true,
        });

      if (!sessions) return undefined;

      const latestDate = sessions.reduce<Date | undefined>(
        (latest, session) => {
          if (session.authenticated_at) {
            const current = new Date(session.authenticated_at);
            if (!latest || current.getTime() > latest.getTime()) {
              return current;
            }
          }
          return latest;
        },
        undefined
      );

      return latestDate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return undefined;
    }
  }

  /**
   * Retrieves the date at which the account associated with a given email was created.
   *
   * @param identity - The identity to look up the creation date for.
   * @returns A promise that resolves to the creation date.
   */
  public async getCreatedAt(identity: Identity): Promise<Date | undefined> {
    if (!identity || !identity.created_at) return undefined;
    return new Date(identity.created_at);
  }

  /**
   * Retrieves the authentication type associated with a given email.
   *
   * @param email - The email address to look up the authentication type for.
   * @returns A promise that resolves to the authentication type.
   */
  public async getAuthenticationTypeFromIdentity(
    identity: Identity
  ): Promise<AuthenticationType[]> {
    if (!identity) {
      return [AuthenticationType.UNKNOWN];
    }

    return this.mapAuthenticationType(identity);
  }
}
