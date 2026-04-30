import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WopiServiceAdapter } from '@services/adapters/wopi-service-adapter/wopi.service.adapter';

@Module({
  imports: [HttpModule],
  providers: [WopiServiceAdapter],
  exports: [WopiServiceAdapter],
})
export class WopiServiceAdapterModule {}
