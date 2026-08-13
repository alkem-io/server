import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import * as creators from './loader.creators';

@Module({
  // Creators are otherwise dependency-free (they take the globally-provided
  // TypeORM EntityManager). MessageAttachmentDimsLoaderCreator is the exception:
  // it batches file-service's `/meta-batch` route, so the adapter module has to
  // be resolvable from this module's injector.
  imports: [FileServiceAdapterModule],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
