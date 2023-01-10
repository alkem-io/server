import { Module } from '@nestjs/common';
import { CommunicationAdapter } from './communication.adapter';
import { MicroservicesModule } from '@core/microservices/microservices.module';

@Module({
  imports: [MicroservicesModule],
  providers: [CommunicationAdapter],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
