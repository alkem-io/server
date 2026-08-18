import { ReactionModule } from '@domain/collaboration/reaction/reaction.module';
import { Module } from '@nestjs/common';
import * as creators from './loader.creators';

@Module({
  imports: [ReactionModule],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
