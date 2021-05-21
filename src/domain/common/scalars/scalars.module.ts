import { Module } from '@nestjs/common';
import { NameID } from './scalar.name.id';

@Module({
  imports: [],
  providers: [NameID],
  exports: [],
})
export class ScalarsModule {}
