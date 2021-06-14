import { IMatrixUser } from '../management/matrix.management.user.interface';

export interface IMatrixCryptographyService {
  generateHmac(user: IMatrixUser, nonce: string, isAdmin?: boolean): string;
}
