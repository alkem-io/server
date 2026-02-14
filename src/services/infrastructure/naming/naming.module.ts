import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';

@Module({
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
