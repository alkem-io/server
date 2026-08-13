import { Module } from '@nestjs/common';
import * as creators from './loader.creators';

@Module({
  // Creators are dependency-free: they take the globally-provided TypeORM
  // EntityManager, so this module needs no imports of its own.
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
