import {
  AadAuthenticationClient,
  Token,
  TokenError,
  UserCredentials,
} from '@cmdbg/tokenator';
import { IdentityService } from '@interfaces/identity.service';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { MsGraphService } from './ms-graph.service';

export class AadIdentityService
  implements IdentityService, AuthenticationProvider {
  constructor(
    private readonly aadAuthenticationClient: AadAuthenticationClient,
    private readonly graphService: MsGraphService
  ) {}

  async authenticateRopc(
    userCredentials?: UserCredentials
  ): Promise<Token | TokenError> {
    return await this.aadAuthenticationClient.authenticateROPC(userCredentials);
  }

  async authenticateObo(access_token: string): Promise<Token | TokenError> {
    return await this.aadAuthenticationClient.authenticateOBO(access_token);
  }

  async createUser(userDto: any, upn: string) {
    await this.graphService.createUser(userDto, upn);
  }

  async removeUser(upn: string) {
    await this.graphService.removeUser(upn);
  }

  async updateUserPassword(upn: string, password: string) {
    await this.graphService.resetPassword(upn, password);
  }

  async userExists(upn: string): Promise<boolean> {
    return await this.graphService.userExists(upn);
  }

  //vyanakiev toDo - review dependencies AadIdentityService - MSGraph. Fix OBO flow.
  async getAccessToken(): Promise<string> {
    return '';
  }
}
