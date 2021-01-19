import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserInput } from '@domain/user/user.dto';
import { UserService } from '@domain/user/user.service';
import { IAzureADConfig } from '@interfaces/aad.config.interface';
import { IServiceConfig } from '@interfaces/service.config.interface';
import { CherrytwistErrorStatus } from '@utils/error-handling/enums/cherrytwist.error.status';
import { AccountException } from '@utils/error-handling/exceptions/account.exception';
import { ValidationException } from '@utils/error-handling/exceptions/validation.exception';
import { LogContext } from '@utils/logging/logging.contexts';
import { MsGraphService } from '@utils/ms-graph/ms-graph.service';

@Injectable()
export class AccountService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private msGraphService: MsGraphService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
      throw new AccountException(
        `Attempting to locate account (${accountUpn}) but account usage is disabled`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_USAGE_DISABLED
      );
    return await this.msGraphService.userExists(undefined, accountUpn);
  }

  // Create an account for the specified user and update the user to store the UPN
  async createUserAccount(userData: UserInput): Promise<boolean> {
    await this.validateAccountCreationRequest(userData);

    const accountUpn = this.buildUPN(userData);

    const result = await this.msGraphService.createUser(userData, accountUpn);
    if (!result)
      throw new AccountException(
        `Unable to complete account creation for ${userData.email} using UPN: ${accountUpn}`,
        LogContext.AUTH,
        CherrytwistErrorStatus.ACCOUNT_CREATION_FAILED
      );

    // Update the user to store the upn
    const user = await this.userService.getUserByEmail(userData.email);
    if (!user)
      throw new AccountException(
        `Unable to update user: ${userData.email}`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_CREATION_FAILED
      );
    user.accountUpn = accountUpn;
    await this.userService.saveUser(user);
    return true;
  }

  // Create an account for the specified user and update the user to store the UPN
  async createAccountForExistingUser(
    userID: number,
    password: string
  ): Promise<boolean> {
    const user = await this.userService.getUserByIdOrFail(userID);

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
      throw new AccountException(
        'Unable to identify the upn domain to be used',
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_UPN_DOMAIN_NOT_FOUND
      );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const normalizer = require('normalizer');

    // Note: requesting client has the option to explicilty specify the account UPN to use
    const accountUpn = userData.accountUpn;
    const firstName = userData.firstName;
    const lastName = userData.lastName;
    if (!accountUpn || accountUpn.length == 0) {
      // Not specified, create one automatically based on the user profile data
      if (!firstName)
        throw new ValidationException(
          'Missing first name information for generating UPN',
          LogContext.COMMUNITY
        );
      if (!lastName)
        throw new ValidationException(
          'Missing last name information for generating UPN',
          LogContext.COMMUNITY
        );
    }

    let upn = `${firstName}.${lastName}@${upnDomain}`;

    // remove any unusual characters
    upn = normalizer.normalize(upn);

    // extra check to remove any blank spaces
    upn = upn.replace(/\s/g, '');

    this.logger.verbose?.(`Upn: ${upn}`, LogContext.AUTH);

    return upn;
  }

  async validateAccountCreationRequest(userData: UserInput) {
    if (!this.accountUsageEnabled()) {
      throw new AccountException(
        'Not able to create accounts while authentication is disabled',
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_USAGE_DISABLED
      );
    }
    const tmpPassword = userData.aadPassword;
    if (!tmpPassword)
      throw new AccountException(
        `Unable to create account for user (${userData.name} as no password provided)`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_CREATION_FAILED
      );

    const accountUpn = this.buildUPN(userData);

    // Check if the account exists already
    const accountExists = await this.accountExists(accountUpn);
    if (accountExists)
      throw new AccountException(
        `There already exists an account with UPN (${accountUpn}); please choose another`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_CREATION_FAILED
      );
  }

  async removeUserAccount(accountUpn: string): Promise<boolean> {
    if (accountUpn === '') {
      throw new AccountException(
        `Failed to delete account ${accountUpn}`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_DELETION_FAILED
      );
    }

    let res = false;
    try {
      res = await this.msGraphService.deleteUser(accountUpn);
    } catch (error) {
      throw new AccountException(
        `Failed to delete account ${accountUpn}. ${error}`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_DELETION_FAILED
      );
    }

    if (res === undefined) return true;
    return false;
  }

  async updateUserAccountPassword(
    accountUpn: string,
    newPassword: string
  ): Promise<boolean> {
    if (accountUpn === '') {
      throw new ValidationException(
        'Account UPN is missing! Failed to reset password for account!',
        LogContext.COMMUNITY
      );
    }

    let res = false;
    try {
      res = await this.msGraphService.resetPassword(accountUpn, newPassword);
    } catch (error) {
      throw new AccountException(
        `Failed to reset password for account ${accountUpn} ${error}`,
        LogContext.COMMUNITY,
        CherrytwistErrorStatus.ACCOUNT_UPDATE_FAILED
      );
    }

    if (res === undefined) return true;
    return false;
  }
}
