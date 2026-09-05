import { MemoModule } from '@domain/common/memo/memo.module';
import { Module } from '@nestjs/common';
import { ContentSigningController } from './content.signing.controller';

@Module({ imports: [MemoModule], controllers: [ContentSigningController] })
export class ContentSigningRestModule {}
