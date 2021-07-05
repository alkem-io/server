import { Module } from '@nestjs/common';
import { MatrixRoomAdapterService } from './matrix.room.adapter.service';

@Module({
  imports: [],
  providers: [MatrixRoomAdapterService],
  exports: [MatrixRoomAdapterService],
})
export class MatrixRoomAdapterModule {}
