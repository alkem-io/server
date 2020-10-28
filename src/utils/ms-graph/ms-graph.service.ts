import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { Client, ClientOptions } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { UserInput } from '../../domain/user/user.dto';
import { AzureADStrategy } from '../authentication/aad.strategy';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class MsGraphService {
  constructor(
    @Inject(forwardRef(() => AzureADStrategy))
    private azureAdStrategy: AzureADStrategy,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  async callResourceAPI(accessToken: string, resourceURI: string) {
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-type': 'application/json',
        Accept: 'application/json',
        'Accept-Charset': 'utf-8',
      },
    };

    const response = await fetch(resourceURI, options);
    const json = await response.json();
    return json;
  }

  async createUser(userData: UserInput): Promise<any> {
    const clientOptions: ClientOptions = {
      authProvider: this.azureAdStrategy,
    };
    const client = Client.initWithMiddleware(clientOptions);

    const nickname = await this.getMailNickname(userData.email);
    const upn = await this.buildUPN(client, userData.email);

    const user = {
      accountEnabled: true,
      givenName: userData.firstName,
      surname: userData.lastName,
      displayName: userData.name,
      mailNickname: nickname,
      userPrincipalName: upn,
      mail: userData.email,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: userData.aadPassword,
      },
    };

    const res = await client.api('/users').post(user);

    return res;
  }

  async getOrganisation(client: Client): Promise<any> {
    const res = await client.api('/organization').get();
    return res;
  }

  async getUser(client: Client | undefined, email: string): Promise<any> {
    if (!client) {
      const clientOptions: ClientOptions = {
        authProvider: this.azureAdStrategy,
      };
      client = Client.initWithMiddleware(clientOptions);
    }

    const upn = await this.buildUPN(client, email);
    let res = undefined;
    try {
      res = await client.api(`/users/${upn}`).get();
    } catch (error) {
      this.logger.error(error);
    }
    return res;
  }

  async userExists(
    client: Client | undefined,
    email: string
  ): Promise<boolean> {
    let user;
    try {
      user = await this.getUser(client, email);
    } catch (error) {
      this.logger.error(error);
    }

    if (user) return true;
    return false;
  }

  async getTenantName(client: Client): Promise<string | undefined> {
    let tenantName = undefined;
    try {
      const org = await this.getOrganisation(client);
      tenantName = org.value[0]['verifiedDomains'][0]['name'];
    } catch (error) {
      this.logger.error(error);
    }

    return tenantName;
  }

  async buildUPN(client: Client, email: string): Promise<string> {
    try {
      if (!client) {
        const clientOptions: ClientOptions = {
          authProvider: this.azureAdStrategy,
        };
        client = Client.initWithMiddleware(clientOptions);
      }

      const tenantName = await this.getTenantName(client);
      this.logger.verbose(`Tenant name: ${tenantName}`);
      const mailNickname = await this.getMailNickname(email);
      this.logger.verbose(`Mail nickname: ${mailNickname}`);
      const upn = `${mailNickname}@${tenantName}`;
      this.logger.verbose(`Upn: ${upn}`);

      return upn;
    } catch (error) {
      this.logger.error(error);
    }
    return '';
  }

  async getMailNickname(email: string): Promise<string> {
    return email.split('@')[0];
  }
}
