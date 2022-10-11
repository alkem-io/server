import { Module } from '@nestjs/common';
import { MatrixCryptographyService } from '@services/external/matrix/cryptography/matrix.cryptography.service';

@Module({
  providers: [MatrixCryptographyService],
  exports: [MatrixCryptographyService],
})
export class MatrixCryptographyModule {}
