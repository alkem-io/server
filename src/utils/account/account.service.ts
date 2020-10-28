import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { UserInput } from '../../domain/user/user.dto';
import { UserService } from '../../domain/user/user.service';
import { IAzureADConfig } from '../../interfaces/aad.config.interface';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { MsGraphService } from '../ms-graph/ms-graph.service';

@Injectable()
export class AccountService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private msGraphService: MsGraphService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  authenticationEnabled(): boolean {
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    )
      return false;
    return true;
  }

  accountUsageEnabled(): boolean {
    // Currently the only factor for account usage is authentication enabled or not i.e. accounts are used if auth is enabled
    return this.authenticationEnabled();
  }

  async accountExists(accountUpn: string): Promise<boolean> {
    // Should not be called if account usage is disabled
    if (!this.accountUsageEnabled())
      throw new Error(
        `Attempting to locate account (${accountUpn}) but account usage is disabled`
      );
    return await this.msGraphService.userExists(undefined, accountUpn);
  }

  // Create the user and add the user into the members group
  async createUserAccount(userID: number, password: string): Promise<boolean> {
    if (!this.accountUsageEnabled()) {
      throw new Error(
        'Not able to create accounts while authentication is disabled'
      );
    }
    const ctUser = await this.userService.getUserByID(userID);
    if (!ctUser) throw new Error(`No user with given id located: ${userID}`);

    const existingUpn = ctUser.accountUpn;
    const accountExists =
      existingUpn.length > 0 && (await this.accountExists(existingUpn));

    if (accountExists) {
      this.logger.verbose(`User ${ctUser.accountUpn} already exists!`);
      return false;
    }

    const userData = new UserInput();
    userData.name = ctUser.name;
    userData.firstName = ctUser.firstName;
    userData.lastName = ctUser.lastName;
    userData.email = ctUser.email;
    userData.aadPassword = password;

    const accountUpn = this.buildUPN(userData.firstName, userData.lastName);

    const result = await this.msGraphService.createUser(userData, accountUpn);
    if (result) {
      // store the generated account UPN
      ctUser.accountUpn = accountUpn;
      return await this.userService.saveUser(ctUser);
    }
    return true;
  }

  buildUPN(firstName: string, lastName: string): string {
    const upnDomain = this.configService.get<IAzureADConfig>('aad')?.upnDomain;
    if (!upnDomain)
      throw new Error('Unable to identify the upn domain to be used');

    const upn = `${firstName}.${lastName}@${upnDomain}`;
    this.logger.verbose(`Upn: ${upn}`);

    return upn;
  }
}
