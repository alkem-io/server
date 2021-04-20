import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationModule } from '../application/application.module';
import { Community } from './community.entity';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';

@Module({
  imports: [
    UserGroupModule,
    UserModule,
    ApplicationModule,
    LifecycleModule,
    TypeOrmModule.forFeature([Community]),
  ],
  providers: [
    CommunityService,
    CommunityResolverMutations,
    CommunityResolverFields,
    CommunityLifecycleOptionsProvider,
  ],
  exports: [CommunityService],
})
export class CommunityModule {}
