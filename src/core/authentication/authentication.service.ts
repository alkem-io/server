import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  Configuration,
  FrontendApi,
  IdentityApi,
  Session,
} from '@ory/kratos-client';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from '../authentication.agent.info/agent.info';
import {
  OryDefaultIdentitySchema,
  OryTraits,
} from './ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { getBearerToken } from './get.bearer.token';
import { SessionExtendException } from '@common/exceptions/auth';

import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { getSession } from '@common/utils';
import ConfigUtils from '@config/config.utils';
import { AlkemioConfig } from '@src/types';
import { AuthenticationType } from '@common/enums/authentication.type';
import { AgentInfoMetadata } from '@core/authentication.agent.info/agent.info.metadata';

@Injectable()
export class AuthenticationService {
  private readonly kratosPublicUrlServer: string;
  private readonly adminPasswordIdentifier: string;
  private readonly adminPassword: string;
  private readonly extendSessionMinRemainingTTL: number | undefined; // min time before session expires when it's already allowed to be extended (in milliseconds)
  private readonly kratosIdentityClient: IdentityApi;
  private readonly kratosFrontEndClient: FrontendApi;

  constructor(
    private agentCacheService: AgentInfoCacheService,
    private configService: ConfigService<AlkemioConfig, true>,
    private userService: UserService,
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.kratosPublicUrlServer = this.configService.get(
      'identity.authentication.providers.ory.kratos_public_base_url_server',
      { infer: true }
    );
    const {
      kratos_public_base_url_server,
      kratos_admin_base_url_server,
      admin_service_account,
      earliest_possible_extend,
    } = this.configService.get('identity.authentication.providers.ory', {
      infer: true,
    });
    this.kratosPublicUrlServer = kratos_public_base_url_server;
    const kratosAdminUrlServer = kratos_admin_base_url_server;

    this.adminPasswordIdentifier = admin_service_account.username;
    this.adminPassword = admin_service_account.password;

    this.extendSessionMinRemainingTTL = this.parseEarliestPossibleExtend(
      earliest_possible_extend
    );

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

  async getAgentInfo(opts: { cookie?: string; authorization?: string }) {
    let session: Session | undefined;
    try {
      session = await getSession(this.kratosFrontEndClient, opts);
    } catch (e) {
      return new AgentInfo();
    }

    if (!session?.identity) {
      return new AgentInfo();
    }

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return this.createAgentInfo(oryIdentity);
  }

  /**
   * Creates and returns an `AgentInfo` object based on the provided Ory identity and session.
   *
   * @param oryIdentity - Optional Ory identity schema containing user traits.
   * @param session - Optional session information.
   * @returns A promise that resolves to an `AgentInfo` object.
   *
   * This method performs the following steps:
   * 1. Validates the provided Ory identity.
   * 2. Checks for cached agent information based on the email from the Ory identity.
   * 3. Builds basic agent information if no cached information is found.
   * 4. Maps the authentication type from the session.
   * 5. Retrieves additional metadata for the agent.
   * 6. Populates the agent information with the retrieved metadata.
   * 7. Adds verified credentials if enabled.
   * 8. Caches the agent information.
   */
  async createAgentInfo(
    oryIdentity?: OryDefaultIdentitySchema,
    session?: Session
  ): Promise<AgentInfo> {
    if (!oryIdentity) return new AgentInfo();

    const oryTraits = this.validateEmail(oryIdentity);

    const cachedAgentInfo = await this.getCachedAgentInfo(oryTraits.email);
    if (cachedAgentInfo) return cachedAgentInfo;

    const agentInfo = this.buildBasicAgentInfo(oryIdentity, session);
    agentInfo.authenticationType = this.mapAuthenticationType(session);

    const agentInfoMetadata = await this.getAgentInfoMetadata(agentInfo.email);
    if (!agentInfoMetadata) return agentInfo;

    this.populateAgentInfoWithMetadata(agentInfo, agentInfoMetadata);
    await this.addVerifiedCredentialsIfEnabled(
      agentInfo,
      agentInfoMetadata.agentID
    );

    await this.agentCacheService.setAgentInfoCache(agentInfo);
    return agentInfo;
  }

  /**
   * Validates the email trait of the provided Ory identity.
   *
   * @param oryIdentity - The Ory identity schema containing traits to be validated.
   * @returns The validated Ory traits.
   * @throws NotSupportedException - If the email trait is missing or empty.
   */
  private validateEmail(oryIdentity: OryDefaultIdentitySchema): OryTraits {
    const oryTraits = oryIdentity.traits;
    if (!oryTraits.email || oryTraits.email.length === 0) {
      throw new NotSupportedException(
        'Session without email encountered',
        LogContext.AUTH
      );
    }
    return oryTraits;
  }

  /**
   * Retrieves the cached agent information for a given email.
   *
   * @param email - The email address of the agent.
   * @returns A promise that resolves to the agent information if found in the cache, or undefined if not found.
   */
  private async getCachedAgentInfo(
    email: string
  ): Promise<AgentInfo | undefined> {
    return await this.agentCacheService.getAgentInfoFromCache(email);
  }

  /**
   * Builds and returns an `AgentInfo` object based on the provided Ory identity schema and session.
   *
   * @param oryIdentity - The Ory identity schema containing user traits and verifiable addresses.
   * @param session - Optional session object containing session details like expiration time.
   * @returns An `AgentInfo` object populated with the user's email, name, avatar URL, and session expiry.
   */
  private buildBasicAgentInfo(
    oryIdentity: OryDefaultIdentitySchema,
    session?: Session
  ): AgentInfo {
    const agentInfo = new AgentInfo();
    const oryTraits = oryIdentity.traits;
    const isEmailVerified =
      oryIdentity.verifiable_addresses.find(x => x.via === 'email')?.verified ??
      false;

    agentInfo.email = oryTraits.email;
    agentInfo.emailVerified = isEmailVerified;
    agentInfo.firstName = oryTraits.name.first;
    agentInfo.lastName = oryTraits.name.last;
    agentInfo.avatarURL = oryTraits.picture;
    agentInfo.expiry = session?.expires_at
      ? new Date(session.expires_at).getTime()
      : undefined;

    return agentInfo;
  }

  /**
   * Maps the authentication type based on the provided session information.
   *
   * @param session - The session object containing authentication methods.
   * @returns The corresponding `AuthenticationType` based on the provider and method.
   *
   * - If the provider is 'microsoft', returns `AuthenticationType.MICROSOFT`.
   * - If the provider is 'linkedin', returns `AuthenticationType.LINKEDIN`.
   * - If the method is 'password', returns `AuthenticationType.EMAIL`.
   * - Otherwise, returns `AuthenticationType.UNKNOWN`.
   */
  private mapAuthenticationType(session?: Session): AuthenticationType {
    const authenticationMethod = session?.authentication_methods?.[0];
    const provider = authenticationMethod?.provider;
    const method = authenticationMethod?.method;

    if (provider === 'microsoft') return AuthenticationType.MICROSOFT;
    if (provider === 'linkedin') return AuthenticationType.LINKEDIN;
    if (method === 'password') return AuthenticationType.EMAIL;

    return AuthenticationType.UNKNOWN;
  }

  /**
   * Retrieves the agent information metadata for a given email.
   *
   * @param email - The email address of the user whose agent information metadata is to be retrieved.
   * @returns A promise that resolves to the agent information metadata if found, or undefined if the user is not registered.
   * @throws Will log an error message if the user is not registered.
   */
  private async getAgentInfoMetadata(
    email: string
  ): Promise<AgentInfoMetadata | undefined> {
    try {
      return await this.userService.getAgentInfoMetadata(email);
    } catch (error) {
      this.logger.verbose?.(
        `User not registered: ${email}, ${error}`,
        LogContext.AUTH
      );
      return undefined;
    }
  }

  /**
   * Populates the given `agentInfo` object with metadata from `agentInfoMetadata`.
   *
   * @param agentInfo - The agent information object to be populated.
   * @param agentInfoMetadata - The metadata containing information to populate the agent info.
   *
   * @remarks
   * This method assigns the `agentID`, `userID`, and `communicationID` from `agentInfoMetadata` to `agentInfo`.
   * If `agentInfoMetadata` contains credentials, they are also assigned to `agentInfo`.
   * If credentials are not available, a warning is logged.
   */
  private populateAgentInfoWithMetadata(
    agentInfo: AgentInfo,
    agentInfoMetadata: AgentInfoMetadata
  ): void {
    agentInfo.agentID = agentInfoMetadata.agentID;
    agentInfo.userID = agentInfoMetadata.userID;
    agentInfo.communicationID = agentInfoMetadata.communicationID;

    if (agentInfoMetadata.credentials) {
      agentInfo.credentials = agentInfoMetadata.credentials;
    } else {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve credentials for registered user: ${agentInfo.email}`,
        LogContext.AUTH
      );
    }
  }

  /**
   * Adds verified credentials to the agent information if SSI (Self-Sovereign Identity) is enabled.
   *
   * @param agentInfo - The information of the agent to which verified credentials will be added.
   * @param agentID - The unique identifier of the agent.
   * @returns A promise that resolves when the operation is complete.
   */
  private async addVerifiedCredentialsIfEnabled(
    agentInfo: AgentInfo,
    agentID: string
  ): Promise<void> {
    const ssiEnabled = this.configService.get('ssi.enabled', { infer: true });
    if (ssiEnabled) {
      const verifiedCredentials =
        await this.agentService.getVerifiedCredentials(agentID);
      agentInfo.verifiedCredentials = verifiedCredentials;
    }
  }

  public async extendSession(sessionToBeExtended: Session): Promise<void> {
    const adminBearerToken = await getBearerToken(
      this.kratosPublicUrlServer,
      this.adminPasswordIdentifier,
      this.adminPassword
    );

    return this.tryExtendSession(sessionToBeExtended, adminBearerToken);
  }
  // Refresh and Extend Sessions
  // https://www.ory.sh/docs/guides/session-management/refresh-extend-sessions
  private async tryExtendSession(
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

  public shouldExtendSession(session: Session): boolean {
    if (!session.expires_at || !this.extendSessionMinRemainingTTL) {
      return false;
    }
    if (this.extendSessionMinRemainingTTL === -1) {
      return true; // Set to -1 if specified as lifespan in config, meaning it can be extended at any time
    }

    const expiry = new Date(session.expires_at);
    return Date.now() >= expiry.getTime() - this.extendSessionMinRemainingTTL;
  }

  private parseEarliestPossibleExtend(
    earliestPossibleExtend: unknown
  ): number | undefined {
    /**
     * If you need high flexibility when extending sessions, you can set earliest_possible_extend to lifespan,
     * which allows sessions to be refreshed during their entire lifespan, even right after they are created.
     * Source https://www.ory.sh/docs/kratos/session-management/refresh-extend-sessions
     */
    if (earliestPossibleExtend === 'lifespan') {
      return -1;
    }
    if (typeof earliestPossibleExtend === 'string') {
      const seconds = ConfigUtils.parseHMSString(earliestPossibleExtend);
      if (seconds) {
        return seconds * 1000;
      }
    }
    return undefined;
  }
}
