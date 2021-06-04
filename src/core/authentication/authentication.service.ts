import { AuthorizationCredential, LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from './agent-info';
import { Credential } from '@domain/agent/credential';

@Injectable()
export class AuthenticationService {
  constructor(
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgentInfo(email: string): Promise<AgentInfo> {
    const agentInfo = new AgentInfo();
    agentInfo.email = email;
    const userExists = await this.userService.isRegisteredUser(email);
    if (userExists) {
      const user = await this.userService.getUserWithAgent(email);
      this.logger.verbose?.(
        `Authentication Info: User registered: ${email}, with id: ${user.id}`,
        LogContext.AUTH
      );
      const credentials = user?.agent?.credentials;
      if (!credentials) {
        this.logger.warn?.(
          `Authentication Info: Unable to retrieve credentials for registered user: ${email}`,
          LogContext.AUTH
        );
      } else {
        agentInfo.credentials = credentials;
      }
    } else {
      this.logger.verbose?.(
        `Authentication Info: User not registered: ${email}`,
        LogContext.AUTH
      );
      // Allow the user to create a credential for themselves for the context of this request
      const createUserCredential = new Credential(
        AuthorizationCredential.UserSelfManagement,
        agentInfo.email
      );
      agentInfo.credentials.push(createUserCredential);
    }
    return agentInfo;
  }
}
