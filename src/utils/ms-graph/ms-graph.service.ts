import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client, ClientOptions } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { UserInput } from '@domain/user/user.dto';
import { AadOboStrategy } from '@utils/authentication/aad.obo.strategy';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@utils/logging/logging.contexts';
import { AccountException } from '@utils/error-handling/exceptions/account.exception';

@Injectable()
export class MsGraphService {
  constructor(
    private oboStrategy: AadOboStrategy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUser(userData: UserInput, accountUpn: string): Promise<any> {
    const clientOptions: ClientOptions = {
      authProvider: this.oboStrategy,
    };
    const client = Client.initWithMiddleware(clientOptions);

    const mailNickname = this.getMailNickname(userData.email);
    const user = {
      accountEnabled: true,
      givenName: userData.firstName,
      surname: userData.lastName,
      displayName: userData.name,
      mailNickname: mailNickname,
      userPrincipalName: accountUpn,
      mail: userData.email.trim(),
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: userData.aadPassword,
      },
    };

    const res = await client.api('/users').post(user);

    return res;
  }

  async deleteUser(accountUpn: string): Promise<any> {
    const clientOptions: ClientOptions = {
      authProvider: this.oboStrategy,
    };
    const client = Client.initWithMiddleware(clientOptions);
    const res = await client.api(`/users/${accountUpn}`).delete();

    return res;
  }

  async getOrganisation(client: Client): Promise<any> {
    const res = await client.api('/organization').get();
    return res;
  }

  async getAllUsers(client: Client | undefined): Promise<any> {
    if (!client) {
      const clientOptions: ClientOptions = {
        authProvider: this.oboStrategy,
      };
      client = Client.initWithMiddleware(clientOptions);
    }

    let res = undefined;
    try {
      res = await client.api('/users').get();
    } catch (error) {
      throw new AccountException(error.message, LogContext.COMMUNITY);
    }
    return res.value;
  }

  async userExists(
    client: Client | undefined,
    accountUpn: string
  ): Promise<boolean> {
    try {
      const users = (await this.getAllUsers(client)) as any[];
      if (
        users.some(({ userPrincipalName }) => userPrincipalName === accountUpn)
      )
        return true;
    } catch (error) {
      throw new AccountException(error.message, LogContext.COMMUNITY);
    }

    return false;
  }

  getMailNickname(email: string): string {
    return email.split('@')[0];
  }

  async getTenantName(client: Client): Promise<string | undefined> {
    let tenantName = undefined;
    try {
      const org = await this.getOrganisation(client);
      tenantName = org.value[0]['verifiedDomains'][0]['name'];
    } catch (error) {
      throw new AccountException(error.message, LogContext.COMMUNITY);
    }

    return tenantName;
  }

  async resetPassword(accountUpn: string, newPassword: string): Promise<any> {
    const clientOptions: ClientOptions = {
      authProvider: this.oboStrategy,
    };

    const passwordResetResponse = {
      newPassword: newPassword,
    };

    const client = Client.initWithMiddleware(clientOptions);
    const userId = (await client.api(`/users/${accountUpn}?$select=id`).get())
      .id;
    //https://docs.microsoft.com/en-us/graph/api/authentication-list-passwordmethods?view=graph-rest-beta&tabs=http
    //we are parking this until the api call is moved to the production version of ms graph API
    const req = `/users/${userId}/authentication/passwordMethods/${userId}/resetPassword`;
    const res = await client
      .api(req)
      .version('beta')
      .post(passwordResetResponse);

    return res;
  }
}
