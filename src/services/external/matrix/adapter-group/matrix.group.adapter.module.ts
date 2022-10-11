import { Module } from '@nestjs/common';
import { MatrixGroupAdapter } from './matrix.group.adapter';

@Module({
  imports: [],
  providers: [MatrixGroupAdapter],
  exports: [MatrixGroupAdapter],
})
export class MatrixGroupAdapterModule {}
