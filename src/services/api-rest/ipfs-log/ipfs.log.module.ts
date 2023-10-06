import { Module } from '@nestjs/common';
import { IpfsLogController } from './ipfs.log.controller';

@Module({
  controllers: [IpfsLogController],
  exports: [],
})
export class IpfsLogModule {}
