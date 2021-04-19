import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { forwardRef, Module } from '@nestjs/common';
import { CommunityModule } from '../community.module';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { CommuntiyLifecycleResolverMutations } from './community.lifecycle.resolver.mutations';

@Module({
  imports: [
    ApplicationModule,
    LifecycleModule,
    forwardRef(() => CommunityModule),
  ],
  providers: [
    CommunityLifecycleOptionsProvider,
    CommuntiyLifecycleResolverMutations,
  ],
  exports: [CommunityLifecycleOptionsProvider],
})
export class CommunityLifecycleModule {}
