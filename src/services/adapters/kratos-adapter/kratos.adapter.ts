import { AuthenticationType } from '@common/enums/authentication.type';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityApi, Configuration, Identity } from '@ory/kratos-client';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { ConfigService } from '@nestjs/config';
import { LogContext } from '@common/enums';

@Injectable()
export class KratosAdapter {
  private readonly kratosIdentityClient: IdentityApi;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const { kratos_admin_base_url_server } = this.configService.get(
      'identity.authentication.providers.ory',
      {
        infer: true,
      }
    );
    const kratosAdminUrlServer = kratos_admin_base_url_server;
    this.kratosIdentityClient = new IdentityApi(
      new Configuration({
        basePath: kratosAdminUrlServer,
      })
    );
  }

  /**
   * Maps the provided identity to an authentication type.
   *
   * @param identity - The identity object containing credentials.
   * @returns The corresponding authentication type based on the identity's credentials.
   *
   * The function checks the following conditions in order:
   * - If the identity has OIDC credentials, it examines the identifiers:
   *   - If the identifier starts with 'microsoft', it returns `AuthenticationType.MICROSOFT`.
   *   - If the identifier starts with 'linkedin', it returns `AuthenticationType.LINKEDIN`.
   * - If the identity has password credentials, it returns `AuthenticationType.EMAIL`.
   * - If none of the above conditions are met, it returns `AuthenticationType.UNKNOWN`.
   */
  public mapAuthenticationType(identity: Identity): AuthenticationType {
    if (identity.credentials) {
      if (identity.credentials.oidc) {
        const identifiers = identity.credentials.oidc.identifiers;
        if (!identifiers) return AuthenticationType.UNKNOWN;
        const identifier = identifiers[0];
        if (!identifier) return AuthenticationType.UNKNOWN;
        if (identifier.startsWith('microsoft'))
          return AuthenticationType.MICROSOFT;
        if (identifier.startsWith('linkedin'))
          return AuthenticationType.LINKEDIN;
      } else {
        if (identity.credentials.password) return AuthenticationType.EMAIL;
      }
    }

    return AuthenticationType.UNKNOWN;
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
   * }
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
}
