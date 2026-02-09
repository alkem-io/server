import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WingbackManager } from './wingback.manager';

@Module({
  imports: [HttpModule],
  providers: [WingbackManager],
  exports: [WingbackManager],
})
export class WingbackManagerModule {}
