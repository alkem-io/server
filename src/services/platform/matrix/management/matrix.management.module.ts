import { HttpModule, Module } from '@nestjs/common';
import { MatrixCryptographyModule } from '@src/services/platform/matrix/cryptography/matrix.cryptography.module';
import { MatrixManagementUserService } from '@src/services/platform/matrix/management/matrix.management.user.service';

@Module({
  imports: [MatrixCryptographyModule, HttpModule],
  providers: [MatrixManagementUserService],
  exports: [MatrixManagementUserService],
})
export class MatrixManagementModule {}
