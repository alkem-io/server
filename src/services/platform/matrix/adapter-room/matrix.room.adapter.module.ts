import { Module } from '@nestjs/common';
import { MatrixRoomAdapter } from './matrix.room.adapter';

@Module({
  imports: [],
  providers: [MatrixRoomAdapter],
  exports: [MatrixRoomAdapter],
})
export class MatrixRoomAdapterModule {}
