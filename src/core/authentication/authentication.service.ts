import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from './agent-info';
import { NotSupportedException } from '@common/exceptions';
import { WALLET_MANAGEMENT_SERVICE } from '@common/constants/providers';
import {
  catchError,
  firstValueFrom,
  from,
  identity,
  lastValueFrom,
  tap,
} from 'rxjs';
@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    @Inject(WALLET_MANAGEMENT_SERVICE)
    private walletManagementClient: ClientProxy,
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
    agentInfo.communicationID = user.communicationID;

    // Store also retrieved verified credentials; todo: likely slow, need to evaluate other options
    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;

    if (ssiEnabled) {
      const identityInfo$ = this.walletManagementClient.send(
        { cmd: 'getIdentityInfo' },
        {
          did: agent.did,
          password: agent.password,
        }
      );

      try {
        const identityInfo = await firstValueFrom(identityInfo$);
        agentInfo.verifiedCredentials = await identityInfo;
      } catch (err) {
        this.logger.error?.(
          `Failed to get identity info from wallet manager: ${err}`,
          LogContext.AUTH
        );
      }

      //   const identityInfo = await new Promise((resolve, _reject) =>
      //     from(
      //       this.walletManagementClient
      //         .send(
      //           { cmd: 'getIdentityInfo' },
      //           {
      //             did: agent.did,
      //             password: agent.password,
      //           }
      //         )
      //         .pipe(
      //           tap(identityInfo => {
      //             this.logger.verbose?.(
      //               `SSI Agent: Retrieved: ${JSON.stringify(identityInfo)}`,
      //               LogContext.AUTH
      //             );
      //             agentInfo.verifiedCredentials =
      //               identityInfo.verifiedCredentials;
      //             resolve(agentInfo);
      //           }),
      //           catchError(err => {
      //             this.logger.error(
      //               `Failed to get identity info from wallet manager: ${err}`,
      //               LogContext.SSI
      //             );
      //             throw new Error(err.message);
      //           })
      //         )
      //     ).subscribe()
      //   );
    }

    return agentInfo;
  }
}
