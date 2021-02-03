import { AadAuthenticationClient, Token, TokenError } from '@cmdbg/tokenator';
import { IdentityService } from '@interfaces/idp.service';

export class AadIdentityService implements IdentityService {
  constructor(
    private readonly aadAuthenticationClient: AadAuthenticationClient
  ) {}

  async authenticateRopc(): Promise<Token | TokenError> {
    return await this.aadAuthenticationClient.authenticateROPC();
  }

  async authenticateObo(access_token: string): Promise<Token | TokenError> {
    return await this.aadAuthenticationClient.authenticateOBO(access_token);
  }

  async createUserAccount() {
    throw new Error('Method not implemented.');
  }

  async deleteUserAccount() {
    throw new Error('Method not implemented.');
  }
}
