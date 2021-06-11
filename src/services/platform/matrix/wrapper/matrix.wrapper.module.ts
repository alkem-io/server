import { Module } from '@nestjs/common';
import { MatrixUserModule } from '../user/user.matrix.module';
import { MatrixWrapperPool } from './matrix.wrapper.pool';

@Module({
  imports: [MatrixUserModule],
  providers: [MatrixWrapperPool],
  exports: [MatrixWrapperPool],
})
export class MatrixWrapperModule {}
