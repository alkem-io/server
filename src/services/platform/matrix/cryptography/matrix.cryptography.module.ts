import { Module } from '@nestjs/common';
import { MatrixCryptographyService } from '@src/services/platform/matrix/cryptography/matrix.cryptography.service';

@Module({
  providers: [MatrixCryptographyService],
  exports: [MatrixCryptographyService],
})
export class MatrixCryptographyModule {}
