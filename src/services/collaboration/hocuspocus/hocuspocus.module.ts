import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HocuspocusService } from './hocuspocus.service';

@Module({
  imports: [ConfigModule],
  providers: [HocuspocusService],
  exports: [HocuspocusService],
})
export class HocuspocusModule {}
