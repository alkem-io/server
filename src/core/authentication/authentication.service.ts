import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Configuration, FrontendApi, IdentityApi, Session } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from './agent-info';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { getBearerToken } from './get.bearer.token';
import { SessionExtendException } from '@common/exceptions/auth';

import { AgentCacheService } from '@domain/agent/agent/agent.cache.service';
import { getSession } from '@common/utils';

@Injectable()
export class AuthenticationService {
  private readonly kratosPublicUrlServer: string;
  private readonly adminPasswordIdentifier: string;
  private readonly adminPassword: string;
  private readonly extendAfter: number;
  private readonly kratosIdentityClient: IdentityApi;
  private readonly kratosFrontEndClient: FrontendApi;

  constructor(
    private agentCacheService: AgentCacheService,
    private configService: ConfigService,
    private userService: UserService,
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.kratosPublicUrlServer = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;
    const kratosAdminUrlServer = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_admin_base_url_server;

    this.adminPasswordIdentifier = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.admin_service_account.username;
    this.adminPassword = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.admin_service_account.password;

    this.extendAfter =
      Number(
        this.configService.get(ConfigurationTypes.IDENTITY).authentication
          .providers.ory.earliest_possible_extend
      ) *
      60 *
      60 *
      1000;

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

  async getAgentInfo(opts: {
    cookie?: string;
    authorization?: string;
    token?: string;
  }) {
    try {
      const session = await getSession(this.kratosFrontEndClient, opts);

      if (!session.identity) {
        return new AgentInfo();
      }

      const oryIdentity = session.identity as OryDefaultIdentitySchema;
      return this.createAgentInfo(oryIdentity);
    } catch (e: any) {
      throw new Error(e?.message);
    }
  }

  async createAgentInfo(
    oryIdentity?: OryDefaultIdentitySchema,
    session?: Session
  ): Promise<AgentInfo> {
    const agentInfo = new AgentInfo();
    if (!oryIdentity) {
      return agentInfo;
    }

    const oryTraits = oryIdentity.traits;
    if (!oryTraits.email || oryTraits.email.length === 0) {
      throw new NotSupportedException(
        'Session without email encountered',
        LogContext.AUTH
      );
    }

    const cachedAgentInfo = await this.agentCacheService.getAgentInfoFromCache(
      oryTraits.email
    );
    if (cachedAgentInfo) return cachedAgentInfo;

    const isEmailVerified =
      oryIdentity.verifiable_addresses.find(x => x.via === 'email')?.verified ??
      false;
    // Have a valid identity, get the information from Ory
    agentInfo.email = oryTraits.email;
    agentInfo.emailVerified = isEmailVerified;
    agentInfo.firstName = oryTraits.name.first;
    agentInfo.lastName = oryTraits.name.last;
    agentInfo.avatarURL = oryTraits.picture;
    agentInfo.expiry = session?.expires_at
      ? new Date(session.expires_at).getTime()
      : undefined;
    let agentInfoMetadata;

    try {
      agentInfoMetadata = await this.userService.getAgentInfoMetadata(
        agentInfo.email
      );
    } catch (error) {
      this.logger.verbose?.(
        `User not registered: ${agentInfo.email}`,
        LogContext.AUTH
      );
    }

    if (!agentInfoMetadata) {
      this.logger.verbose?.(
        `User: no profile: ${agentInfo.email}`,
        LogContext.AUTH
      );
      // No credentials to obtain, pass on what is there
      return agentInfo;
    }
    this.logger.verbose?.(
      `Use: registered: ${agentInfo.email}`,
      LogContext.AUTH
    );

    if (!agentInfoMetadata.credentials) {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve credentials for registered user: ${agentInfo.email}`,
        LogContext.AUTH
      );
    } else {
      agentInfo.credentials = agentInfoMetadata.credentials;
    }
    agentInfo.agentID = agentInfoMetadata.agentID;
    agentInfo.userID = agentInfoMetadata.userID;
    agentInfo.communicationID = agentInfoMetadata.communicationID;

    // Store also retrieved verified credentials; todo: likely slow, need to evaluate other options
    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;

    if (ssiEnabled) {
      const VCs = await this.agentService.getVerifiedCredentials({
        id: agentInfoMetadata.agentID,
        did: agentInfoMetadata.did,
        password: agentInfoMetadata.password,
      });

      agentInfo.verifiedCredentials = VCs;
    }

    await this.agentCacheService.setAgentInfoCache(agentInfo);

    return agentInfo;
  }

  public async extendSession(sessionToBeExtended: Session): Promise<Session> {
    const bearerToken = await getBearerToken(
      this.kratosPublicUrlServer,
      this.adminPasswordIdentifier,
      this.adminPassword
    );

    return this.tryExtendSession(sessionToBeExtended, bearerToken);
  }
  // Refresh and Extend Sessions
  // https://www.ory.sh/docs/guides/session-management/refresh-extend-sessions
  private async tryExtendSession(
    sessionToBeExtended: Session,
    bearerToken: string
  ): Promise<Session | never> {
    let newSession: Session;

    try {
      const { data } = await this.kratosIdentityClient.extendSession(
        { id: sessionToBeExtended.id },
        { headers: { authorization: `Bearer ${bearerToken}` } }
      );
      newSession = data;
      this.logger?.verbose?.(
        `Session ${sessionToBeExtended.id} extended for identity ${sessionToBeExtended.identity.id}`
      );
    } catch (e) {
      const message = (e as Error)?.message ?? e;
      throw new SessionExtendException(
        `Session extend for session ${sessionToBeExtended.id} failed with: ${message}`
      );
    }

    return newSession;
  }

  public shouldExtendSession(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const expiry = new Date(session.expires_at);
    return Date.now() >= expiry.getTime() - this.extendAfter;
  }
}