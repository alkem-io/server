import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Session } from '@ory/kratos-client';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '../authentication.agent.info/agent.info';
import { NotSupportedException } from '@common/exceptions';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import ConfigUtils from '@config/config.utils';
import { AlkemioConfig } from '@src/types';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { OryTraits } from '@services/infrastructure/kratos/types/ory.traits';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AgentService } from '@domain/agent/agent/agent.service';

@Injectable()
export class AuthenticationService {
  private readonly extendSessionMinRemainingTTL: number | undefined; // min time before session expires when it's already allowed to be extended (in milliseconds)

  constructor(
    private agentInfoCacheService: AgentInfoCacheService,
    private agentInfoService: AgentInfoService,
    private configService: ConfigService<AlkemioConfig, true>,
    private kratosService: KratosService,
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const { earliest_possible_extend } = this.configService.get(
      'identity.authentication.providers.ory',
      {
        infer: true,
      }
    );

    this.extendSessionMinRemainingTTL = this.parseEarliestPossibleExtend(
      earliest_possible_extend
    );
  }

  public async getAgentInfo(opts: {
    cookie?: string;
    authorization?: string;
    guestName?: string;
  }): Promise<AgentInfo> {
    let session: Session | undefined;
    try {
      session = await this.kratosService.getSession(
        opts.authorization,
        opts.cookie
      );
      if (session?.identity) {
        const oryIdentity = session.identity as OryDefaultIdentitySchema;
        return this.createAgentInfo(oryIdentity);
      }
    } catch {}

    if (opts.guestName) {
      return this.agentInfoService.createGuestAgentInfo(opts.guestName);
    }
    return this.agentInfoService.createAnonymousAgentInfo();
  }

  /**
   * Adds verified credentials to the agent information if SSI (Self-Sovereign Identity) is enabled.
   *
   * @param agentInfo - The information of the agent to which verified credentials will be added.
   * @param agentID - The unique identifier of the agent.
   * @returns A promise that resolves when the operation is complete.
   */
  public async addVerifiedCredentialsIfEnabled(
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
    if (!oryIdentity) return this.agentInfoService.createAnonymousAgentInfo();

    const oryTraits = this.validateEmail(oryIdentity);

    const cachedAgentInfo = await this.getCachedAgentInfo(oryTraits.email);
    if (cachedAgentInfo) return cachedAgentInfo;

    const agentInfo = this.buildAgentInfoFromOrySession(oryIdentity, session);

    const agentInfoMetadata = await this.agentInfoService.getAgentInfoMetadata(
      agentInfo.email
    );
    if (!agentInfoMetadata) return agentInfo;

    this.agentInfoService.populateAgentInfoWithMetadata(
      agentInfo,
      agentInfoMetadata
    );
    await this.addVerifiedCredentialsIfEnabled(
      agentInfo,
      agentInfoMetadata.agentID
    );

    await this.agentInfoCacheService.setAgentInfoCache(agentInfo);
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
    return await this.agentInfoCacheService.getAgentInfoFromCache(email);
  }

  /**
   * Builds and returns an `AgentInfo` object based on the provided Ory identity schema and session.
   *
   * @param oryIdentity - The Ory identity schema containing user traits and verifiable addresses.
   * @param session - Optional session object containing session details like expiration time.
   * @returns An `AgentInfo` object populated with the user's email, name, avatar URL, and session expiry.
   */
  private buildAgentInfoFromOrySession(
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

  public async extendSession(sessionToBeExtended: Session): Promise<void> {
    const adminBearerToken = await this.kratosService.getBearerToken();

    return this.kratosService.tryExtendSession(
      sessionToBeExtended,
      adminBearerToken
    );
  }

  /**
   * Determines whether a session should be extended based on its expiration time and a minimum remaining TTL (Time To Live).
   *
   * @param session - The session object containing the expiration time.
   * @returns `true` if the session should be extended, `false` otherwise.
   *
   * The function checks the following conditions:
   * - If the session does not have an expiration time (`expires_at`) or the minimum remaining TTL (`extendSessionMinRemainingTTL`) is not set, it returns `false`.
   * - If the minimum remaining TTL is set to `-1`, it returns `true`, indicating that the session can be extended at any time.
   * - Otherwise, it calculates the session's expiry time and compares it with the current time plus the minimum remaining TTL to determine if the session should be extended.
   */
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

  /**
   * Parses the `earliestPossibleExtend` parameter to determine the earliest possible time to extend a session.
   *
   * If the `earliestPossibleExtend` is set to 'lifespan', it returns -1, allowing sessions to be refreshed during their entire lifespan.
   * If the `earliestPossibleExtend` is a string, it attempts to parse it as a time duration in HMS format and returns the equivalent milliseconds.
   * If the parsing fails or the input is of an unexpected type, it returns `undefined`.
   *
   * @param earliestPossibleExtend - The input value representing the earliest possible time to extend a session. It can be 'lifespan' or a string in HMS format.
   * @returns The earliest possible extend time in milliseconds, -1 for 'lifespan', or `undefined` if the input is invalid.
   */
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
