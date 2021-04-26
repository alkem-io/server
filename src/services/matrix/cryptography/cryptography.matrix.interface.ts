import { IMatrixUser } from '../user/user.matrix.interface';

export interface IMatrixCryptographyService {
  generateHmac(user: IMatrixUser, nonce: string, isAdmin?: boolean): string;
}
