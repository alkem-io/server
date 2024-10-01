import { Module } from '@nestjs/common';
import { CommunityCommunicationService } from './community.communication.service';
import { CommunicationModule } from '@domain/communication/communication/communication.module';

@Module({
  imports: [CommunicationModule],
  providers: [CommunityCommunicationService],
  exports: [CommunityCommunicationService],
})
export class CommunityCommunicationModule {}
