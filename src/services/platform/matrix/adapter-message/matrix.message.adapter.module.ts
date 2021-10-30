import { Module } from '@nestjs/common';
import { MatrixMessageAdapter } from './matrix.message.adapter';

@Module({
  imports: [],
  providers: [MatrixMessageAdapter],
  exports: [MatrixMessageAdapter],
})
export class MatrixMessageAdapterModule {}
