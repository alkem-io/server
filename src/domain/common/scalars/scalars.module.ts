import { Module } from '@nestjs/common';
import { TextID } from './scalar.textid';

@Module({
  imports: [],
  providers: [TextID],
  exports: [],
})
export class ScalarsModule {}
