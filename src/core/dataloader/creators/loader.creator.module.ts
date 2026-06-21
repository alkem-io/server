import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import * as creators from './loader.creators';

@Module({
  imports: [FileServiceAdapterModule],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
