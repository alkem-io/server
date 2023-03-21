import { Module } from '@nestjs/common';
import * as creators from './loader.creators';

@Module({
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
