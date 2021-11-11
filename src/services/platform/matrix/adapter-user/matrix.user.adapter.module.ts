import { Module } from '@nestjs/common';
import { MatrixUserAdapter } from './matrix.user.adapter';

@Module({
  imports: [],
  providers: [MatrixUserAdapter],
  exports: [MatrixUserAdapter],
})
export class MatrixUserAdapterModule {}
