import { Module } from '@nestjs/common';
import { MatrixCommunicationModule } from '@src/services/matrix/communication/communication.matrix.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [MatrixCommunicationModule],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
