import { Module } from '@nestjs/common';
import { IpfsService } from './ipfs.service';

@Module({
  providers: [IpfsService],
})
export class IpfsModule {}
