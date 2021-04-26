import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
import { MatrixCryptographyService } from './cryptography.matrix.service';

@Module({
  providers: [MatrixCryptographyService],
  exports: [MatrixCryptographyService],
})
export class MatrixCryptographyModule {}
