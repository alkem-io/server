import { MemoModule } from '@domain/common/memo/memo.module';
import { Module } from '@nestjs/common';
import { MemoPdfController } from './memo.pdf.controller';

@Module({
  imports: [MemoModule],
  controllers: [MemoPdfController],
})
export class MemoPdfRestModule {}
