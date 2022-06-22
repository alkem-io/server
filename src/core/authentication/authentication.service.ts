import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Session } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from './agent-info';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { getBearerToken } from './get.bearer.token';

@Injectable()
export class AuthenticationService {
  private readonly kratosPublicUrl: string;
  private readonly kratosPrivateUrl: string;
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
    this.kratosPublicUrl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;
    this.extendAfter = Number(
      this.configService.get(ConfigurationTypes.IDENTITY).authentication
        .providers.ory.earliest_possible_extend
    );
    // todo: read from env
    this.kratosPrivateUrl = '';
    this.adminPasswordIdentifier = '';
    this.adminPassword = '';
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

  public async extendSession(sessionToBeExtended: Session): Promise<boolean> {
    let bearerToken: string;

    try {
      bearerToken = await getBearerToken(
        this.kratosPublicUrl,
        this.adminPasswordIdentifier,
        this.adminPassword
      );
    } catch (e) {
      const message = (e as Error)?.message;
      this.logger?.error(
        `Error occurred while trying to verify ${this.adminPasswordIdentifier} for a session extend of session ${sessionToBeExtended.id} for identity ${sessionToBeExtended.identity.id}: ${message}`
      );

      return false;
    }

    let extendResult: string | true;

    try {
      extendResult = await this.tryExtendSession(
        sessionToBeExtended,
        bearerToken
      );
    } catch (e) {
      const err = e as AxiosError;
      this.logger?.error(
        `Error occurred while trying to extend session ${sessionToBeExtended.id} for identity ${sessionToBeExtended.identity.id}: ${err?.message}`
      );

      return false;
    }

    if (typeof extendResult === 'string') {
      this.logger?.error(
        `Extension of session ${sessionToBeExtended.id} for identity ${sessionToBeExtended.identity.id} rejected with: ${extendResult}`
      );

      return false;
    }

    this.logger?.verbose?.(
      `Session ${sessionToBeExtended.id} extended for identity ${sessionToBeExtended.identity.id}`
    );
    return true;
  }
  // Refresh and Extend Sessions
  // https://www.ory.sh/docs/guides/session-management/refresh-extend-sessions
  private async tryExtendSession(
    sessionToBeExtended: Session,
    bearerToken: string
  ): Promise<true | string> | never {
    return this.httpService
      .request<Session>({
        method: 'PATCH',
        url: this.getExtendApiUrl(sessionToBeExtended),
        headers: { authorization: `Bearer ${bearerToken}` },
      })
      .toPromise()
      .then(
        () => true,
        (rejErr: unknown) => (rejErr as Error)?.message ?? rejErr
      );
  }

  public shouldExtendSession(session: Session): boolean {
    const expiry = new Date(session.expires_at);
    return Date.now() >= expiry.getTime() - this.extendAfter;
  }

  private getExtendApiUrl(session: Session) {
    return `${this.kratosPrivateUrl}/sessions/${session.id}/extend`;
  }
}
