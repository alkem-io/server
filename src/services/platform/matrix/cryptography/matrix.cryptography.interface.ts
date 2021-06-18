import { IMatrixUser } from '@src/services/platform/matrix/management/matrix.management.user.interface';

export interface IMatrixCryptographyService {
  generateHmac(user: IMatrixUser, nonce: string, isAdmin?: boolean): string;
}
