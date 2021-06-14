import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { MatrixCryptographyService } from './matrix.cryptography.service';

@Module({
  providers: [MatrixCryptographyService],
  exports: [MatrixCryptographyService],
})
export class MatrixCryptographyModule {}
