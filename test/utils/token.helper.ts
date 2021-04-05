import { AadAuthenticationClient, AuthConfig, Token } from '@cmdbg/tokenator';
import { ConfigService } from '@nestjs/config';

export class TokenHelper {
  private users = Object.values(TestUser);
  private aadAuthenticationClient: AadAuthenticationClient;

  constructor(configService: ConfigService) {
    this.aadAuthenticationClient = new AadAuthenticationClient(
      () => configService.get<AuthConfig>('aad_ropc') as AuthConfig
    );
  }

  private async buildUpn(user: string): Promise<string> {
    const domain = process.env.AUTH_AAD_UPN_DOMAIN ?? '';
    const userUpn = `${user}@${domain}`;

    return userUpn;
  }

  private async getPassword(): Promise<string> {
    return process.env.AUTH_AAD_TEST_HARNESS_PASSWORD ?? '';
  }

  /**
   * Builds a map with access tokens for each user in the TestUser enum.
   * Uses ROPC client flow to authenticate the users.
   *
   * @api public
   * @returns Returns a map in the form of <username, access_token>.
   */
  async buildUserTokenMap(): Promise<Map<string, string>> {
    const userTokenMap: Map<string, string> = new Map();
    const password = await this.getPassword();

    for (const user of this.users) {
      const upn = await this.buildUpn(user);
      const res = await this.aadAuthenticationClient.authenticateROPC({
        username: upn,
        password,
      });

      const token = (res as Token).access_token;

      userTokenMap.set(user, token);
    }

    return userTokenMap;
  }
}

/**
 * Enum with CT users used for testing different auth scenarios.
 * These users need to be created in CT Client (so both Profile and Account are created)
 * in order to add new test users / roles for API tests for auth, add the users here and
 * create them in CT client - all with the same password. Add the password to .env
 * to AUTH_AAD_TEST_HARNESS_PASSWORD env variable. AUTH_AAD_UPN_DOMAIN also needs to be
 * set to the domain against whom tests will be ran.
 */
export enum TestUser {
  GLOBAL_ADMIN = 'admin',
  ECOVERSE_ADMIN = 'ecoverse.admin',
  COMMUNITY_ADMIN = 'community.admin',
  ECOVERSE_MEMBER = 'ecoverse.member',
  NON_ECOVERSE_MEMBER = 'non.ecoverse',
}
