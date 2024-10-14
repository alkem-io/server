import {
  BearerTokenNotFoundException,
  LoginFlowException,
  LoginFlowInitializeException,
  SessionExtendException,
} from '@common/exceptions/auth';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import {
  Configuration,
  FrontendApi,
  Identity,
  IdentityApi,
  Session,
} from '@ory/kratos-client';
import jwt_decode from 'jwt-decode';
import { getSession } from '@common/utils/get.session';
import { LogContext } from '@common/enums';
import { AuthenticationType } from '@common/enums/authentication.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { KratosPayload } from './types/kratos.payload';

/**
 * The `KratosService` class provides methods to interact with the Ory Kratos identity management system.
 * It includes functionalities for session management, such as extending sessions, retrieving sessions,
 * and obtaining bearer tokens through login flows.
 *
 * @remarks
 * This service relies on the Ory Kratos Identity and Frontend APIs to perform its operations.
 * It uses the `ConfigService` to retrieve necessary configuration values for initializing the API clients.
 *
 * @example
 * ```typescript
 * const kratosService = new KratosService(configService);
 * const session = await kratosService.getSession('authorization-token');
 * const extendedSession = await kratosService.extendSession(session);
 * ```
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
   * Extends the given session by obtaining an admin bearer token and attempting to extend the session.
   *
   * @param sessionToBeExtended - The session object that needs to be extended.
   * @returns A promise that resolves when the session has been successfully extended.
   */
  public async extendSession(sessionToBeExtended: Session): Promise<void> {
    const adminBearerToken = await this.getBearerToken();

    return this.tryExtendSession(sessionToBeExtended, adminBearerToken);
  }

  public async getSession(
    authorization?: string,
    cookie?: string
  ): Promise<Session | never> {
    const kratosClient = this.kratosFrontEndClient;

    return getSession(kratosClient, { authorization, cookie });
  }

  /**
   * Retrieves a Kratos session from a JWT token.
   *
   * @param token - The JWT token from which to extract the session.
   * @returns The extracted Kratos session.
   * @throws Will throw an error if the token is empty.
   * @throws Will throw an error if the token is a Bearer token.
   * @throws Will throw an error if the token is not a valid JWT token.
   * @throws Will throw an error if the Kratos session is not found in the token.
   */
  public getSessionFromJwt(token: string): Session | never {
    if (!token) {
      throw new Error('Token is empty!');
    }

    let session: Session | null;
    const isBearerToken = token.startsWith('Bearer ');
    if (isBearerToken) {
      throw new Error('Bearer token found, not decodable as JWT');
    }

    try {
      const decodedKatosPaylod = jwt_decode<KratosPayload>(token);
      session = decodedKatosPaylod.session;
    } catch (error: any) {
      throw new Error(error?.message ?? 'Token is not a valid JWT token!');
    }

    if (!session) {
      throw new Error('Kratos session not found in token');
    }

    return session;
  }

  /**
   * Retrieves a bearer token by initiating and completing a login flow with the provided identifier and password.
   *
   * @param identifier - The identifier (e.g., username or email) used for login.
   * @param password - The password associated with the identifier.
   * @returns A promise that resolves to a bearer token string.
   * @throws LoginFlowInitializeException - If the login flow initialization fails.
   * @throws LoginFlowException - If the login flow update fails.
   * @throws BearerTokenNotFoundException - If the bearer token is not found after the login flow completes.
   */
  public async getBearerToken(): Promise<string> | never {
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
   * Attempts to extend a given session using the Kratos Identity Client.
   *
   * @param sessionToBeExtended - The session object that needs to be extended.
   * @param adminBearerToken - The admin bearer token used for authorization.
   * @returns A promise that resolves to void if the session is successfully extended.
   * @throws {SessionExtendException} If the request to extend the session fails.
   *
   * @remarks
   * This method calls the Kratos Identity Client's `extendSession` endpoint.
   * The endpoint typically returns a 204 No Content response on success.
   * Older Ory Network projects may return a 200 OK response with the session in the body.
   * Returning the session as part of the response will be deprecated in the future and should not be relied upon.
   * https://www.ory.sh/docs/guides/session-management/refresh-extend-sessions
   *
   * @see {@link https://www.ory.sh/docs/reference/api#tag/identity/operation/extendSession}
   */
  public async tryExtendSession(
    sessionToBeExtended: Session,
    adminBearerToken: string
  ): Promise<void> {
    try {
      /**
       * This endpoint returns per default a 204 No Content response on success.
       * Older Ory Network projects may return a 200 OK response with the session in the body.
       * **Returning the session as part of the response will be deprecated in the future and should not be relied upon.**
       * Source https://www.ory.sh/docs/reference/api#tag/identity/operation/extendSession
       */
      const { status } = await this.kratosIdentityClient.extendSession(
        { id: sessionToBeExtended.id },
        { headers: { authorization: `Bearer ${adminBearerToken}` } }
      );

      if (![200, 204].includes(status)) {
        throw new SessionExtendException(
          `Request to extend session ${sessionToBeExtended.id} failed with status ${status}`
        );
      }
    } catch (e) {
      if (e instanceof SessionExtendException) {
        throw e;
      }
      const message = (e as Error)?.message ?? e;
      throw new SessionExtendException(
        `Session extend for session ${sessionToBeExtended.id} failed with: ${message}`
      );
    }
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
}
