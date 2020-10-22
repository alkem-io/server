import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserInput } from '../../domain/user/user.dto';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { MsGraphService } from '../ms-graph/ms-graph.service';

@Injectable()
export class AccountService {
  constructor(
    private configService: ConfigService,
    private msGraphService: MsGraphService
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

  async accountExists(email: string): Promise<boolean> {
    // Should not be called if account usage is disabled
    if (!this.accountUsageEnabled())
      throw new Error(
        `Attempting to locate account (${email}) but account usage is disabled`
      );
    return await this.msGraphService.userExists(undefined, email);
  }

  async createAccount(userData: UserInput): Promise<boolean> {
    await this.msGraphService.createUser(userData);
    return true;
  }
}
