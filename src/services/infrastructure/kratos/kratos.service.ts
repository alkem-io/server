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
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import { LogContext } from '@common/enums';
import { AuthenticationType } from '@common/enums/authentication.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { OryDefaultIdentitySchema } from './types/ory.default.identity.schema';
import { SessionInvalidReason } from './types/session.invalid.enum';

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
   * @returns The corresponding authentication types based on the identity's credentials.
   *
   * The function checks the following conditions in order:
   * - If the identity has OIDC credentials, it examines the identifiers:
   *   - If the identifier starts with 'microsoft', it adds `AuthenticationType.MICROSOFT`.
   *   - If the identifier starts with 'linkedin', it adds `AuthenticationType.LINKEDIN`.
   *   - If the identifier starts with 'github', it adds `AuthenticationType.GITHUB`.
   * - If the identity has password credentials, it adds `AuthenticationType.EMAIL`.
   * - If none of the above conditions are met, it adds `AuthenticationType.UNKNOWN`.
   */
  public mapAuthenticationType(identity: Identity): AuthenticationType[] {
    if (!identity?.credentials) {
      return [AuthenticationType.UNKNOWN];
    }

    const authTypes: AuthenticationType[] = [];
    const oidcIdentifiers = identity.credentials.oidc?.identifiers;
    const identifier = oidcIdentifiers?.[0];

    if (identifier) {
      if (identifier.startsWith('microsoft'))
        authTypes.push(AuthenticationType.MICROSOFT);
      if (identifier.startsWith('linkedin'))
        authTypes.push(AuthenticationType.LINKEDIN);
      if (identifier.startsWith('github'))
        authTypes.push(AuthenticationType.GITHUB);
    }

    if (identity.credentials.password) {
      authTypes.push(AuthenticationType.EMAIL);
    }

    return authTypes.length ? authTypes : [AuthenticationType.UNKNOWN];
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

  /***
 Checks if the session is still valid.
 */
  public validateSession(
    session?: Session
  ):
    | { valid: true; reason?: undefined }
    | { valid: false; reason: SessionInvalidReason } {
    if (!session) {
      return {
        valid: false,
        reason: 'Session not defined',
      };
    }

    if (session.expires_at == undefined) {
      return {
        valid: false,
        reason: 'Session expiry not defined',
      };
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return {
        valid: false,
        reason: 'Session expired',
      };
    }

    return { valid: true };
  }

  public async getHeadersFromCookie(cookie?: string): Promise<any> {
    /**
     * Session cookies in Ory Kratos are pass-by-value (meaning they are not just an id or a reference to a session).
     * When session is updated, new cookie must be obtained and sent to the client.
     * toSession() calls /sessions/whoami endpoint that handles that.
     * Another strategy (may be a more reliable one) is to call /sessions/whoami from the client for the cookies.
     * In that case we may want to set a special header (e.g. X-Session-Extended) to indicate that the session is extended,
     * that in turns will trigger the client to call /sessions/whoami.
     */
    const { headers } = await this.kratosFrontEndClient.toSession({
      cookie,
    });
    return headers;
  }

  public async getSessionFromBearerToken(
    bearerToken?: string
  ): Promise<Session> {
    const { data } = await this.kratosFrontEndClient.toSession({
      xSessionToken: bearerToken,
    });
    return data;
  }

  /* Sets the user into the context field or closes the connection */
  public async authenticate(
    headers: Record<string, string | string[] | undefined>,
    authService: AuthenticationService
  ): Promise<AgentInfo> {
    const authorization = headers.authorization as string;

    try {
      const session = await this.getSession(authorization);

      if (!session) {
        this.logger.verbose?.(
          'No Ory Kratos session',
          LogContext.EXCALIDRAW_SERVER
        );
        return authService.createAgentInfo();
      }

      const oryIdentity = session.identity as OryDefaultIdentitySchema;
      return authService.createAgentInfo(oryIdentity);
    } catch (e: any) {
      throw new Error(e?.message);
    }
  }

  /* returns the user agent info */
  public async getUserInfo(
    headers: Record<string, string | string[] | undefined>,
    authService: AuthenticationService
  ): Promise<AgentInfo> {
    try {
      return await this.authenticate(headers, authService);
    } catch (e) {
      const err = e as Error;
      this.logger.error(
        `Error when trying to authenticate with excalidraw server: ${err.message}`,
        err.stack,
        LogContext.EXCALIDRAW_SERVER
      );
      return authService.createAgentInfo();
    }
  }

  public checkSession(session?: Session) {
    const { valid, reason } = this.validateSession(session);

    if (!valid && reason === 'Session expired') {
      return reason;
    }
  }

  /**
   * Retrieves a session using either an authorization header or a cookie.
   * @param authorization - The authorization header value (optional).
   * @param cookie - The cookie value (optional).
   * @returns A promise that resolves to a Session object.
   * @throws {Error} if neither authorization nor cookie is provided, or if session retrieval fails.
   */
  public async getSession(
    authorization?: string,
    cookie?: string
  ): Promise<Session | never> {
    const kratosClient = this.kratosFrontEndClient;

    if (authorization) {
      return this.getSessionFromAuthorizationHeader(
        kratosClient,
        authorization
      );
    }

    if (cookie) {
      return this.getSessionFromCookie(kratosClient, cookie);
    }

    throw new Error('Authorization header or cookie not provided');
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
    } catch (error) {
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

  /**
   * Retrieves a session from a cookie using the Kratos client.
   *
   * @param kratosClient - The Kratos Frontend API client instance.
   * @param cookie - The session cookie to retrieve the session from.
   * @returns A promise that resolves to the session data.
   * @throws Will throw an error if the session retrieval fails.
   */
  getSessionFromCookie = async (kratosClient: FrontendApi, cookie: string) => {
    try {
      return (
        await kratosClient.toSession({
          cookie,
        })
      ).data;
    } catch (e: any) {
      throw new Error(e?.message);
    }
  };

  /**
   * Extracts and validates a session from the provided Authorization header.
   *
   * This function attempts to extract a token from the Authorization header and
   * validate it using two different methods: `getSessionFromJwt` and
   * `getSessionFromApiToken`. If both methods fail, an error is thrown.
   *
   * @param kratosClient - An instance of `FrontendApi` used to validate the token.
   * @param authorizationHeader - The Authorization header containing the token.
   * @returns The session object if the token is valid.
   * @throws Will throw an error if the token is not provided or if it is invalid.
   */
  public getSessionFromAuthorizationHeader(
    kratosClient: FrontendApi,
    authorizationHeader: string
  ) {
    const [, token] = authorizationHeader.split(' ');

    if (!token) {
      throw new Error('Token not provided in the Authorization header');
    }

    try {
      return this.getSessionFromJwt(token);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // ...
    }

    try {
      return this.getSessionFromApiToken(kratosClient, token);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // ...
    }

    throw new Error('Not a valid token provided in the Authorization header');
  }

  /**
   * Retrieves a session from an API token using the Kratos client.
   *
   * @param kratosClient - The Kratos client instance used to fetch the session.
   * @param apiToken - The API token used to retrieve the session.
   * @returns A promise that resolves to a `Session` object.
   * @throws Will throw an error if the API token is an empty string.
   * @throws Will throw an error if the session could not be extracted from the API token.
   * @throws Will throw an error if the session is not found for the given API token.
   */
  getSessionFromApiToken = async (
    kratosClient: FrontendApi,
    apiToken: string
  ): Promise<Session | never> => {
    if (!apiToken) {
      throw new Error('Token is an empty string');
    }

    let session: Session | null;

    try {
      session = (
        await kratosClient.toSession({
          xSessionToken: apiToken,
        })
      ).data;
    } catch (error: any) {
      throw new Error(
        error?.message ?? 'Could not extract session from api token'
      );
    }

    if (!session) {
      throw new Error('Kratos session not found for api token');
    }

    return session;
  };

  /**
   * Extracts a session from a JWT token.
   *
   * @param token - The JWT token from which to extract the session.
   * @returns The extracted session.
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
}
