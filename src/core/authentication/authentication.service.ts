import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from './agent-info';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentCacheService } from '@domain/agent/agent/agent.cache.service';
@Injectable()
export class AuthenticationService {
  constructor(
    private agentCacheService: AgentCacheService,
    private configService: ConfigService,
    private userService: UserService,
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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

    const agentInfoMetadata = await this.userService.getAgentInfoMetadata(
      agentInfo.email
    );
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

    this.agentCacheService.setAgentInfoCache(agentInfo);

    return agentInfo;
  }
}
