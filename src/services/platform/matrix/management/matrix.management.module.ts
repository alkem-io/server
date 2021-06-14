import { HttpModule, Module } from '@nestjs/common';
import { MatrixCryptographyModule } from '../cryptography/matrix.cryptography.module';
import { MatrixManagementUserService } from './matrix.management.user.service';

@Module({
  imports: [MatrixCryptographyModule, HttpModule],
  providers: [MatrixManagementUserService],
  exports: [MatrixManagementUserService],
})
export class MatrixManagementModule {}
