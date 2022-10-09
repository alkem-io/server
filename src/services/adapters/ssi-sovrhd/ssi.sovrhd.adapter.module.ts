import { Module } from '@nestjs/common';
import { SsiSovrhdAdapter } from './ssi.sovrhd.adapter';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [SsiSovrhdAdapter],
  exports: [SsiSovrhdAdapter],
})
export class SsiSovrhdAdapterModule {}
