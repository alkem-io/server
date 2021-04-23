import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';

@Module({
  imports: [],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
