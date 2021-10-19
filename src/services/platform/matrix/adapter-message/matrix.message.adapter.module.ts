import { Module } from '@nestjs/common';
import { MatrixMessageAdapterService } from './matrix.message.adapter.service';

@Module({
  imports: [],
  providers: [MatrixMessageAdapterService],
  exports: [MatrixMessageAdapterService],
})
export class MatrixMessageAdapterModule {}
