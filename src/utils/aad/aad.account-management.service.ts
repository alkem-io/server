import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { AccountManagementService } from '@src/common/interfaces/account-management.service';
import { MsGraphService } from './ms-graph.service';

export class AadAccountManagementService
  implements AccountManagementService, AuthenticationProvider {
  constructor(private readonly graphService: MsGraphService) {}

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
