import { ReactionModule } from '@domain/collaboration/reaction/reaction.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import * as creators from './loader.creators';

@Module({
  imports: [
    FileServiceAdapterModule,
    PlatformAuthorizationPolicyModule,
    ReactionModule,
  ],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
