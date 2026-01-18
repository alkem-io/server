import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { Module } from '@nestjs/common';
import { CommunityCommunicationService } from './community.communication.service';

@Module({
  imports: [CommunicationModule],
  providers: [CommunityCommunicationService],
  exports: [CommunityCommunicationService],
})
export class CommunityCommunicationModule {}
