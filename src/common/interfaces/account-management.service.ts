export interface AccountManagementService {
  createUser(userDto: any, upn: string): any;
  updateUserPassword(upn: string, password: string): any;
  removeUser(upn: string): any;
  userExists(upn: string): Promise<boolean>;
}
