import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FileServiceAdapter } from './file.service.adapter';

@Module({
  imports: [HttpModule],
  providers: [FileServiceAdapter],
  exports: [FileServiceAdapter],
})
export class FileServiceAdapterModule {}
