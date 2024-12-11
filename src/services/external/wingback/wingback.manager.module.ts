import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WingbackManager } from './wingback.manager';

@Module({
  imports: [HttpModule],
  providers: [WingbackManager],
  exports: [WingbackManager],
})
export class WingbackManagerModule {}
