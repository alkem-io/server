import { ConfigurationTypes, LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from './agent-info';
import { SsiAgentService } from '@src/services/platform/ssi/agent/ssi.agent.service';
import { ConfigService } from '@nestjs/config';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
@Injectable()
export class AuthenticationService {
  replaceSpecialCharacters = require('replace-special-characters');
  constructor(
    private configService: ConfigService,
    private ssiAgentService: SsiAgentService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgentInfo(oryIdentity: any): Promise<AgentInfo> {
    if (!oryIdentity) {
      return new AgentInfo();
    }
    // Have a valid identity, get the information from Ory
    const oryTraits = oryIdentity.traits;
    const oryEmail = oryTraits.email;
    const oryFirstName = oryTraits.name.first;
    const oryLastName = oryTraits.name.last;

    const userExists = await this.userService.isRegisteredUser(oryEmail);
    let userIdentifier = '';
    if (userExists) {
      this.logger.verbose?.(
        `Authentication Info: User registered: ${oryEmail}`,
        LogContext.AUTH
      );
      userIdentifier = oryEmail;
    } else {
      // Create the user if the user does not yet exist
      if (oryEmail && oryEmail.length > 0) {
        this.logger.verbose?.(
          `Authentication Info: User does not have a profile: ${oryEmail}, creating...`,
          LogContext.AUTH
        );
        await this.createNewUser(oryEmail, oryFirstName, oryLastName);
        userIdentifier = oryEmail;
      } else {
        this.logger.verbose?.(
          `Authentication Info: User does not have a profile: ${oryEmail}, no data to create a profile...`,
          LogContext.AUTH
        );
      }
    }

    const agentInfo = new AgentInfo();
    // User, if logged in, must now exist
    if (userIdentifier.length > 0) {
      agentInfo.email = userIdentifier;

      const agent = await this.userService.getAgent(oryEmail);
      if (!agent.credentials) {
        this.logger.warn?.(
          `Authentication Info: Unable to retrieve credentials for registered user: ${oryEmail}`,
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
    }

    return agentInfo;
  }

  async createNewUser(email: string, firstName: string, lastName: string) {
    let user = await this.userService.createUser({
      nameID: this.createUserNameID(firstName, lastName),
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      accountUpn: email,
    });
    // And assign credentials, setup authorization
    user = await this.userAuthorizationService.grantCredentials(user);
    await this.userAuthorizationService.applyAuthorizationRules(user);
  }

  createUserNameID(firstName: string, lastName: string): string {
    const randomNumber = Math.floor(Math.random() * 10000).toString();
    const nameID = `${firstName}-${lastName}-${randomNumber}`
      .replace(/\s/g, '')
      .slice(0, 25);
    return this.replaceSpecialCharacters(nameID);
  }
}
