import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ApplicationFactoryModule } from '@domain/community/application/application.factory.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationLifecycleModule } from '../application/state/application.lifecycle.module';
import { Community } from './community.entity';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';

@Module({
  imports: [
    UserGroupModule,
    UserModule,
    ApplicationFactoryModule,
    ApplicationLifecycleModule,
    LifecycleModule,
    TypeOrmModule.forFeature([Community]),
  ],
  providers: [
    CommunityService,
    CommunityResolverMutations,
    CommunityResolverFields,
  ],
  exports: [CommunityService],
})
export class CommunityModule {}
