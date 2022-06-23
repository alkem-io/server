import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Configuration, Session, V0alpha2Api } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from './agent-info';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { getBearerToken } from './get.bearer.token';
import { SessionExtendException } from '@common/exceptions/auth';

@Injectable()
export class AuthenticationService {
  private readonly kratosPublicUrlServer: string;
  private readonly kratosAdminUrlServer: string;
  private readonly adminPasswordIdentifier: string;
  private readonly adminPassword: string;
  private readonly extendAfter: number;

  constructor(
    private configService: ConfigService,
    private agentService: AgentService,
    private userService: UserService,
    private httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.kratosPublicUrlServer = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;
    this.kratosAdminUrlServer = this.configService.get(
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
  }

  async createAgentInfo(
    oryIdentity?: OryDefaultIdentitySchema
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
    const isEmailVerified =
      oryIdentity.verifiable_addresses.find(x => x.via === 'email')?.verified ??
      false;
    // Have a valid identity, get the information from Ory
    agentInfo.email = oryTraits.email;
    agentInfo.emailVerified = isEmailVerified;
    agentInfo.firstName = oryTraits.name.first;
    agentInfo.lastName = oryTraits.name.last;

    const userExists = await this.userService.isRegisteredUser(agentInfo.email);
    if (!userExists) {
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

    // Retrieve the credentials for the user
    const { user, agent } = await this.userService.getUserAndAgent(
      agentInfo.email
    );
    agentInfo.agentID = agent.id;
    if (!agent.credentials) {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve credentials for registered user: ${agentInfo.email}`,
        LogContext.AUTH
      );
    } else {
      agentInfo.credentials = agent.credentials;
    }
    agentInfo.userID = user.id;
    agentInfo.communicationID = user.communicationID;

    // Store also retrieved verified credentials; todo: likely slow, need to evaluate other options
    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;

    if (ssiEnabled) {
      agentInfo.verifiedCredentials =
        await this.agentService.getVerifiedCredentials(agent);
    }

    return agentInfo;
  }

  public async extendSession(sessionToBeExtended: Session): Promise<void> {
    const bearerToken = await getBearerToken(
      this.kratosPublicUrlServer,
      this.adminPasswordIdentifier,
      this.adminPassword
    );

    await this.tryExtendSession(sessionToBeExtended, bearerToken);

    this.logger?.verbose?.(
      `Session ${sessionToBeExtended.id} extended for identity ${sessionToBeExtended.identity.id}`
    );
  }
  // Refresh and Extend Sessions
  // https://www.ory.sh/docs/guides/session-management/refresh-extend-sessions
  private async tryExtendSession(
    sessionToBeExtended: Session,
    bearerToken: string
  ): Promise<void | never> {
    const kratos = new V0alpha2Api(
      new Configuration({
        basePath: this.kratosAdminUrlServer,
      })
    );

    kratos
      .adminExtendSession(sessionToBeExtended.id, {
        headers: { authorization: `Bearer ${bearerToken}` },
      })
      .catch(e => {
        const message = (e as Error)?.message ?? e;
        throw new SessionExtendException(
          `Session extend for session ${sessionToBeExtended.id} failed with: ${message}`
        );
      });
  }

  public shouldExtendSession(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const expiry = new Date(session.expires_at);
    return Date.now() >= expiry.getTime() - this.extendAfter;
  }
}
