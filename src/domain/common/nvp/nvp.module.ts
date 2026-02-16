import { Module } from '@nestjs/common';
import { NVPService } from './nvp.service';

@Module({
  imports: [],
  providers: [NVPService],
  exports: [NVPService],
})
export class NVPModule {}
