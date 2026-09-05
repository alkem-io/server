import { MemoModule } from '@domain/common/memo/memo.module';
import { Module } from '@nestjs/common';
import { ContentSigningController } from './content.signing.controller';
import { ContentSigningReturnFilter } from './content.signing.return.filter';

@Module({
  imports: [MemoModule],
  controllers: [ContentSigningController],
  providers: [ContentSigningReturnFilter],
})
export class ContentSigningRestModule {}
