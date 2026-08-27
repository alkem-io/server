import { ReactionModule } from '@domain/collaboration/reaction/reaction.module';
import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import * as creators from './loader.creators';

@Module({
  imports: [FileServiceAdapterModule, ReactionModule],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
