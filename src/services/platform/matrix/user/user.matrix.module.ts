import { HttpModule, Module } from '@nestjs/common';
import { MatrixCryptographyModule } from '../cryptography/cryptography.matrix.module';
import { MatrixUserService } from './user.matrix.service';

@Module({
  imports: [MatrixCryptographyModule, HttpModule],
  providers: [MatrixUserService],
  exports: [MatrixUserService],
})
export class MatrixUserModule {}
