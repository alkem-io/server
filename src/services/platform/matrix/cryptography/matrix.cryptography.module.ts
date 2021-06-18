import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { MatrixCryptographyService } from '@src/services/platform/matrix/cryptography/matrix.cryptography.service';

@Module({
  providers: [MatrixCryptographyService],
  exports: [MatrixCryptographyService],
})
export class MatrixCryptographyModule {}
