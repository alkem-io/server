import { AccountManagementService } from '@src/common/interfaces/account-management.service';
import { MsGraphService } from './ms-graph.service';

export class AadAccountManagementService implements AccountManagementService {
  constructor(private readonly graphService: MsGraphService) {}

  async createUser(
    userDto: any,
    upn: string,
    accessToken: string
  ): Promise<any> {
    return await this.graphService.createUser(userDto, upn, accessToken);
  }

  async removeUser(upn: string, accessToken: string): Promise<any> {
    return await this.graphService.removeUser(upn, accessToken);
  }

  async updateUserPassword(
    upn: string,
    password: string,
    accessToken: string
  ): Promise<any> {
    return await this.graphService.resetPassword(upn, password, accessToken);
  }

  async userExists(upn: string, accessToken: string): Promise<boolean> {
    return await this.graphService.userExists(upn, accessToken);
  }
}
