import { Module } from '@nestjs/common';
import { MatrixUserAdapterService } from './matrix.user.adapter.service';

@Module({
  imports: [],
  providers: [MatrixUserAdapterService],
  exports: [MatrixUserAdapterService],
})
export class MatrixUserAdapterModule {}
