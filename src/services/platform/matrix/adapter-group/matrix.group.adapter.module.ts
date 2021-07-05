import { Module } from '@nestjs/common';
import { MatrixGroupAdapterService } from './matrix.group.adapter.service';

@Module({
  imports: [],
  providers: [MatrixGroupAdapterService],
  exports: [MatrixGroupAdapterService],
})
export class MatrixGroupAdapterModule {}
