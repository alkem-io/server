//vyanakiev toDo - review location of extension points / contracts
import { Token, TokenError, UserCredentials } from '@cmdbg/tokenator';

export interface IdentityService {
  authenticateRopc(
    userCredentials?: UserCredentials
  ): Promise<Token | TokenError>;
  authenticateObo(access_token: string): Promise<Token | TokenError>;
  createUser(userDto: any, upn: string): any;
  updateUserPassword(upn: string, password: string): any;
  removeUser(upn: string): any;
  userExists(upn: string): Promise<boolean>;
}
