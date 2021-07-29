import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MatrixCryptographyModule } from '@src/services/platform/matrix/cryptography/matrix.cryptography.module';
import { MatrixUserManagementService } from '@src/services/platform/matrix/management/matrix.user.management.service';
import { MatrixUserAdapterModule } from '../adapter-user/matrix.user.adapter.module';

@Module({
  imports: [MatrixUserAdapterModule, MatrixCryptographyModule, HttpModule],
  providers: [MatrixUserManagementService],
  exports: [MatrixUserManagementService],
})
export class MatrixUserManagementModule {}
