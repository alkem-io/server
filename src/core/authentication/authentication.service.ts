import { ConfigurationTypes, LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from './agent-info';
import { SsiAgentService } from '@src/services/platform/ssi/agent/ssi.agent.service';
import { ConfigService } from '@nestjs/config';
import { NotSupportedException } from '@common/exceptions';
@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    private ssiAgentService: SsiAgentService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgentInfo(oryIdentity: any): Promise<AgentInfo> {
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
    // Have a valid identity, get the information from Ory
    agentInfo.email = oryTraits.email;
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
    if (!agent.credentials) {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve credentials for registered user: ${agentInfo.email}`,
        LogContext.AUTH
      );
    } else {
      agentInfo.credentials = agent.credentials;
    }
    agentInfo.userID = user.id;

    // Store also retrieved verified credentials; todo: likely slow, need to evaluate other options
    const ssiEnabled = this.configService.get(ConfigurationTypes.Identity).ssi
      .enabled;
    if (ssiEnabled) {
      agentInfo.verifiedCredentials =
        await this.ssiAgentService.getVerifiedCredentials(
          agent.did,
          agent.password
        );
    }

    return agentInfo;
  }
}
