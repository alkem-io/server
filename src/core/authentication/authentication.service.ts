import {
  AuthorizationCredential,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from './agent-info';
import { Credential } from '@domain/agent/credential';
import { SsiAgentService } from '@src/services/platform/ssi/agent/ssi.agent.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    private ssiAgentService: SsiAgentService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgentInfo(email: string): Promise<AgentInfo> {
    const agentInfo = new AgentInfo();
    agentInfo.email = email;
    const userExists = await this.userService.isRegisteredUser(email);
    if (userExists) {
      const agent = await this.userService.getAgent(email);
      this.logger.verbose?.(
        `Authentication Info: User registered: ${email}.`,
        LogContext.AUTH
      );
      if (!agent.credentials) {
        this.logger.warn?.(
          `Authentication Info: Unable to retrieve credentials for registered user: ${email}`,
          LogContext.AUTH
        );
      } else {
        agentInfo.credentials = agent.credentials;
      }

      // Store also retrieved verified credentials; todo: likely slow, need to evaluate other options
      const ssiEnabled = this.configService.get(ConfigurationTypes.Identity).ssi
        .enabled;
      if (ssiEnabled) {
        agentInfo.verifiedCredentials = await this.ssiAgentService.getVerifiedCredentials(
          agent.did,
          agent.password
        );
      }
    } else {
      this.logger.verbose?.(
        `Authentication Info: User not registered: ${email}`,
        LogContext.AUTH
      );
      // Allow the user to create a credential for themselves for the context of this request if a valid email is being used
      if (email.length > 0) {
        const createUserCredential = new Credential(
          AuthorizationCredential.UserSelfManagement,
          agentInfo.email
        );
        agentInfo.credentials.push(createUserCredential);
      }
    }
    return agentInfo;
  }
}
