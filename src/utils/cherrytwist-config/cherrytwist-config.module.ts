import { Module } from '@nestjs/common';
import { CherrytwistConfigResolver } from './cherrytwist-config.resolver';

@Module({
  providers: [CherrytwistConfigResolver],
})
export class CherrytwistConfigModule {}
