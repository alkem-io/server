export interface AccountManagementService {
  createUser(userDto: any, upn: string, accessToken: string): Promise<any>;
  updateUserPassword(
    upn: string,
    password: string,
    accessToken: string
  ): Promise<any>;
  removeUser(upn: string, accessToken: string): Promise<any>;
  userExists(upn: string, accessToken: string): Promise<boolean>;
}
