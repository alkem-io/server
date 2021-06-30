import { Module } from '@nestjs/common';
import { MatrixGroupAdapterService } from './matrix.group.adapter.service';
import { MatrixRoomAdapterService } from './matrix.room.adapter.service';

@Module({
  imports: [],
  providers: [MatrixRoomAdapterService, MatrixGroupAdapterService],
  exports: [MatrixRoomAdapterService, MatrixGroupAdapterService],
})
export class MatrixAdaptersModule {}
