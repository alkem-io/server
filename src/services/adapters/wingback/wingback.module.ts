import { Module } from '@nestjs/common';
import { WingbackService } from './wingback.service';

@Module({
  providers: [WingbackService],
  exports: [WingbackService],
})
export class WingbackModule {}
