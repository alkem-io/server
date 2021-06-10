import { Module } from '@nestjs/common';
import { MatrixUserModule } from '../user/user.matrix.module';
import { MatrixCommunicationPool } from './communication.matrix.pool';

@Module({
  imports: [MatrixUserModule],
  providers: [MatrixCommunicationPool],
  exports: [MatrixCommunicationPool],
})
export class MatrixCommunicationModule {}
