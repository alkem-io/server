import { RopcStrategy } from '../../src/utils/authentication/ropc.strategy';

export class TokenHelper {
  private users = Object.values(TestUser);
  private ropcStrategy: RopcStrategy;

  constructor(ropcStrategy: RopcStrategy) {
    this.ropcStrategy = ropcStrategy;
  }

  private async buildUpn(user: string): Promise<string> {
    const domain = process.env.AUTH_AAD_UPN_DOMAIN ?? '';
    const userUpn = `${user}@${domain}`;

    return userUpn;
  }

  private async getPassword(): Promise<string> {
    return process.env.AUTH_AAD_TEST_HARNESS_PASSWORD ?? '';
  }

  async buildUserTokenMap(): Promise<Map<string, string>> {
    const userTokenMap: Map<string, string> = new Map();
    const password = await this.getPassword();

    for (const user of this.users) {
      const upn = await this.buildUpn(user);
      const token = await this.ropcStrategy.getAccessTokenForUser(
        upn,
        password
      );

      userTokenMap.set(user, token);
    }

    return userTokenMap;
  }
}

export enum TestUser {
  GLOBAL_ADMIN = 'admin',
  ECOVERSE_ADMIN = 'ecoverse.admin',
  COMMUNITY_ADMIN = 'community.admin',
}
