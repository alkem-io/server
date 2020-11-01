import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
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

  // Create an account for the specified user and update the user to store the UPN
  async createUserAccount(userData: UserInput): Promise<boolean> {
    await this.validateAccountCreationRequest(userData);

    const accountUpn = this.buildUPN(userData);
    try {
      const result = await this.msGraphService.createUser(userData, accountUpn);
      if (!result)
        throw new Error(
          `Unable to complete account creation for ${userData.email} using UPN: ${accountUpn}`
        );
    } catch (e) {
      const msg = `Unable to complete account creation for ${userData.email}: ${e}`;
      this.logger.error(msg);
      throw e;
    }
    // Update the user to store the upn
    const user = await this.userService.getUserByEmail(userData.email);
    if (!user) throw new Error(`Unable to update user: ${userData.email}`);
    user.accountUpn = accountUpn;
    await this.userService.saveUser(user);
    return true;
  }

  // Create an account for the specified user and update the user to store the UPN
  async createAccountForExistingUser(
    userID: number,
    password: string
  ): Promise<boolean> {
    const user = await this.userService.getUserByID(userID);
    if (!user) throw new Error(`Unable to locate user: ${userID}`);
    const userData = new UserInput();
    userData.accountUpn = user.accountUpn;
    userData.aadPassword = password;
    userData.firstName = user.firstName;
    userData.lastName = user.lastName;
    userData.name = user.name;
    userData.email = user.email;

    await this.createUserAccount(userData);
    return true;
  }

  buildUPN(userData: UserInput): string {
    const upnDomain = this.configService.get<IAzureADConfig>('aad')?.upnDomain;
    if (!upnDomain)
      throw new Error('Unable to identify the upn domain to be used');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const normalizer = require('normalizer');

    // Note: requesting client has the option to explicilty specify the account UPN to use
    const accountUpn = userData.accountUpn;
    const firstName = userData.firstName;
    const lastName = userData.lastName;
    if (!accountUpn || accountUpn.length == 0) {
      // Not specified, create one automatically based on the user profile data
      if (!firstName)
        throw new Error('Missing first name information for generating UPN');
      if (!lastName)
        throw new Error('Missing last name information for generating UPN');
    }

    let upn = `${firstName}.${lastName}@${upnDomain}`;

    // remove any unusual characters
    upn = normalizer.normalize(upn);

    // extra check to remove any blank spaces
    upn = upn.replace(/\s/g, '');

    this.logger.verbose(`Upn: ${upn}`);

    return upn;
  }

  async validateAccountCreationRequest(userData: UserInput) {
    if (!this.accountUsageEnabled()) {
      throw new Error(
        'Not able to create accounts while authentication is disabled'
      );
    }
    const tmpPassword = userData.aadPassword;
    if (!tmpPassword)
      throw new Error(
        `Unable to create account for user (${userData.name} as no password provided)`
      );

    const accountUpn = this.buildUPN(userData);

    // Check if the account exists already
    const accountExists = await this.accountExists(accountUpn);
    if (accountExists)
      throw new Error(
        `There already exists an account with UPN (${accountUpn}); please choose another`
      );
  }
}
