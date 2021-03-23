import { Module } from '@nestjs/common';
import { DidResolver } from './did.resolver';

@Module({
  providers: [DidResolver],
})
export class DidModule {}
