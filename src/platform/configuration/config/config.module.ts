import { Module } from '@nestjs/common';
import { KonfigService } from './config.service';

@Module({
  providers: [KonfigService],
  exports: [KonfigService],
})
export class KonfigModule {}
