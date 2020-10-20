import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserInput } from 'src/domain/user/user.dto';
import { IServiceConfig } from 'src/interfaces/service.config.interface';
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

  async accountUsageEnabled(): Promise<boolean> {
    return this.authenticationEnabled();
  }

  async accountExists(email: string): Promise<boolean> {
    // If authentication is disabled then the logic should continue as if an account is present
    if (!this.authenticationEnabled()) return true;
    return await this.msGraphService.userExists(undefined, email);
  }

  async createAccount(userData: UserInput): Promise<boolean> {
    await this.msGraphService.createUser(userData);
    return true;
  }
}
