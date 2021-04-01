import { Module } from '@nestjs/common';
import { IpfsService } from './ipfs.service';
import { IpfsResolver } from './ipfs.resolver';

@Module({
  providers: [IpfsService, IpfsResolver],
})
export class IpfsModule {}
