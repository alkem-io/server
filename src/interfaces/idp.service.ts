import { Token, TokenError } from '@cmdbg/tokenator';

export interface IdentityService {
  authenticateRopc(): Promise<Token | TokenError>;
  authenticateObo(access_token: string): Promise<Token | TokenError>;
  createUserAccount(): any;
  updateUserAccount?(): any;
  deleteUserAccount(): any;
}
